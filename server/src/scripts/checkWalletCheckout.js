/**
 * Self-check for paying bookings from the customer wallet. In-memory DB only,
 * no real SMS or Razorpay calls:
 *   node src/scripts/checkWalletCheckout.js
 */
import assert from 'node:assert/strict'
process.env.MONGODB_URI = '' // never touch a real database
process.env.MSG91_AUTHKEY = '' // never send real SMS
// Dummy keys: "gateway on" for the routing rules; any real call just fails.
process.env.RAZORPAY_KEY_ID = 'rzp_test_dummy'
process.env.RAZORPAY_KEY_SECRET = 'dummy'
const { env } = await import('../config/env.js')
assert.equal(env.mongoUri, '', 'refusing to run against a real database')
const { createApp } = await import('../app.js')
const { User } = await import('../models/User.js')
const { Salon } = await import('../models/Salon.js')
const { Service } = await import('../models/Service.js')
const { WalletTxn } = await import('../models/WalletTxn.js')
const { signToken } = await import('../lib/jwt.js')
const { connectDB, disconnectDB } = await import('../config/db.js')
const { createBookingRecord } = await import('../routes/bookings.routes.js')

const server = createApp().listen(0)
const base = `http://127.0.0.1:${server.address().port}/api`
const call = async (token, method, path, body) => {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body && JSON.stringify(body),
  })
  return { status: res.status, body: await res.json().catch(() => null) }
}
const balance = async (id) => (await User.findById(id)).walletBalance

try {
  await connectDB()
  const owner = await User.create({ phone: '9000000031', name: 'Owner', role: 'owner' })
  const cust = await User.create({ phone: '9000000032', name: 'Cust', walletBalance: 1500 })
  const c = signToken(cust)
  const salon = await Salon.create({
    name: 'S', category: 'mens', city: 'lucknow', area: 'A', address: 'X',
    owner: owner._id, status: 'approved', serviceModes: ['salon'], capacity: 5,
  })
  const cut = await Service.create({ salon: salon._id, owner: owner._id, category: 'mens', name: 'Cut', amount: 1000, mins: 30 })
  const d = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10) // 3 days out → 0% wallet fee
  const draft = (extra) => ({ salonId: salon._id.toString(), serviceIds: [cut._id.toString()], mode: 'salon', date: d, slot: '10:00', paymentMode: 'online', ...extra })
  // First booking gets 10% off: ₹1000 → ₹900 total.

  // Gateway on + wallet doesn't cover it → must pay via Razorpay, nothing debited.
  await User.updateOne({ _id: cust._id }, { walletBalance: 500 })
  let r = await call(c, 'POST', '/bookings', draft({ useWallet: true }))
  assert.equal(r.status, 400)
  assert.equal(await balance(cust._id), 500)
  // The same hole without the wallet: "online" can't skip the gateway either.
  assert.equal((await call(c, 'POST', '/bookings', draft())).status, 400)

  // Wallet covers it all → booked, paid, wallet debited ₹900, ledger row written.
  await User.updateOne({ _id: cust._id }, { walletBalance: 1500 })
  r = await call(c, 'POST', '/bookings', draft({ useWallet: true }))
  assert.equal(r.status, 201)
  const full = r.body.booking
  assert.deepEqual([full.total, full.walletUsed, full.paymentStatus], [900, 900, 'paid'])
  assert.equal(await balance(cust._id), 600)
  assert.equal(await WalletTxn.countDocuments({ user: cust._id, type: 'debit', amount: 900 }), 1)

  // Nothing left for Razorpay to charge → the order endpoint refuses.
  await User.updateOne({ _id: cust._id }, { walletBalance: 5000 })
  assert.equal((await call(c, 'POST', '/payments/order', draft({ useWallet: true, slot: '11:00' }))).status, 400)
  await User.updateOne({ _id: cust._id }, { walletBalance: 600 })

  // Cancel a fully wallet-paid booking asking for UPI → forced to wallet, 0% fee.
  // Two taps at once → refunded exactly once.
  const both = await Promise.all([
    call(c, 'POST', `/bookings/${full.id}/cancel`, { method: 'upi' }),
    call(c, 'POST', `/bookings/${full.id}/cancel`, { method: 'upi' }),
  ])
  assert.deepEqual(both.map((x) => x.status).sort(), [200, 400])
  const cancelled = both.find((x) => x.status === 200).body.booking
  assert.deepEqual([cancelled.refund.method, cancelled.refund.amount], ['wallet', 900])
  assert.equal(await balance(cust._id), 1500)

  // Split payment (as /verify creates it): ₹400 wallet (pinned) + ₹600 gateway.
  // Not first booking any more → total ₹1000.
  const split = await createBookingRecord(
    await User.findById(cust._id),
    draft({ useWallet: true, walletAmount: 400, slot: '12:00' }),
    { paid: true, orderId: 'order_x', paymentId: 'pay_x' },
  )
  assert.deepEqual([split.total, split.walletUsed], [1000, 400])
  assert.equal(await balance(cust._id), 1100)

  // Cancel to UPI (2% fee → ₹980 back): Razorpay can refund at most the ₹600 it
  // took; the other ₹380 returns to the wallet at once.
  r = await call(c, 'POST', `/bookings/${split._id}/cancel`, { method: 'upi' })
  assert.equal(r.status, 200)
  assert.deepEqual([r.body.booking.refund.amount, r.body.booking.refund.walletAmount], [980, 380])
  assert.equal(await balance(cust._id), 1480)

  // Wallet spent elsewhere after the order was made → booking refused, balance untouched.
  await User.updateOne({ _id: cust._id }, { walletBalance: 100 })
  await assert.rejects(
    createBookingRecord(await User.findById(cust._id), draft({ useWallet: true, walletAmount: 400, slot: '13:00' }), { paid: true }),
    (e) => e.walletShort === true,
  )
  assert.equal(await balance(cust._id), 100)

  // A booking the salon already completed can't be cancelled for a refund.
  await User.updateOne({ _id: cust._id }, { walletBalance: 2000 })
  const served = await createBookingRecord(
    await User.findById(cust._id),
    draft({ useWallet: true, slot: '14:00' }),
    { paid: true },
  )
  const o = signToken(owner)
  // Two taps on Complete at once → one succeeds, the owner is credited once.
  const ownerBefore = await balance(owner._id)
  const taps = await Promise.all([1, 2].map(() =>
    call(o, 'PATCH', `/bookings/${served._id}/complete`, { otp: served.completionOtp })))
  assert.deepEqual(taps.map((x) => x.status).sort(), [200, 400])
  assert.equal(await balance(owner._id), ownerBefore + served.salonPayout)
  const before = await balance(cust._id)
  assert.equal((await call(c, 'POST', `/bookings/${served._id}/cancel`, { method: 'wallet' })).status, 400)
  assert.equal(await balance(cust._id), before)

  console.log('wallet checkout: all checks passed')
} finally {
  server.close()
  await disconnectDB()
}
