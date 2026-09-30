/**
 * Self-check for owner withdrawals + founder payouts. In-memory DB only:
 *   MONGODB_URI= node src/scripts/checkWithdrawals.js
 */
import assert from 'node:assert/strict'
process.env.MONGODB_URI = '' // never touch a real database
process.env.MSG91_AUTHKEY = '' // never send real SMS
const { env } = await import('../config/env.js')
assert.equal(env.mongoUri, '', 'refusing to run against a real database')
const { createApp } = await import('../app.js')
const { User } = await import('../models/User.js')
const { signToken } = await import('../lib/jwt.js')
const { connectDB, disconnectDB } = await import('../config/db.js')

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

try {
  await connectDB()
  const owner = await User.create({ phone: '9000000001', name: 'Owner', role: 'owner', walletBalance: 1500 })
  const founder = await User.create({ phone: '9000000002', name: 'Founder', role: 'founder' })
  const o = signToken(owner)
  const f = signToken(founder)

  // No payout details yet → blocked.
  let r = await call(o, 'POST', '/withdrawals', { amount: 1000, method: 'instant' })
  assert.equal(r.status, 400)
  assert.match(r.body.error, /UPI/)

  // Bad UPI, half a bank account → rejected; valid UPI → saved (normalised).
  assert.equal((await call(o, 'PUT', '/withdrawals/payout-details', { upi: 'nope' })).status, 400)
  assert.equal((await call(o, 'PUT', '/withdrawals/payout-details', { accountNumber: '123456789' })).status, 400)
  r = await call(o, 'PUT', '/withdrawals/payout-details', { upi: ' Ravi.K@OKAXIS ', accountName: '', accountNumber: '', ifsc: '' })
  assert.equal(r.status, 200)
  assert.equal(r.body.payout.upi, 'ravi.k@okaxis')

  // Owners can't request weekly any more (it's automatic).
  assert.equal((await call(o, 'POST', '/withdrawals', { amount: 1000, method: 'weekly' })).status, 400)
  // Instant = 7%: ₹1000 → fee ₹70, owner gets ₹930; wallet debited the gross.
  r = await call(o, 'POST', '/withdrawals', { amount: 1000 })
  assert.equal(r.status, 201)
  assert.deepEqual([r.body.withdrawal.fee, r.body.withdrawal.net, r.body.balance], [70, 930, 500])
  assert.equal(r.body.withdrawal.destination.upi, 'ravi.k@okaxis')
  const weeklyId = r.body.withdrawal.id

  // Two ₹500 requests at once against a ₹500 balance → exactly one succeeds.
  const both = await Promise.all([
    call(o, 'POST', '/withdrawals', { amount: 500, method: 'instant' }),
    call(o, 'POST', '/withdrawals', { amount: 500, method: 'instant' }),
  ])
  assert.deepEqual(both.map((x) => x.status).sort(), [201, 400])
  const instant = both.find((x) => x.status === 201).body.withdrawal
  assert.deepEqual([instant.fee, instant.net], [35, 465]) // 7%
  assert.equal((await User.findById(owner._id)).walletBalance, 0)

  // Owners can't use founder routes.
  assert.equal((await call(o, 'GET', '/withdrawals/all')).status, 403)

  // Founder: list shows owner + destination; reject refunds the gross once.
  r = await call(f, 'GET', '/withdrawals/all')
  assert.equal(r.body.withdrawals.length, 2)
  assert.equal(r.body.withdrawals[0].owner.name, 'Owner')
  r = await call(f, 'PATCH', `/withdrawals/${weeklyId}`, { status: 'rejected', note: 'Wrong UPI' })
  assert.equal(r.status, 200)
  assert.equal((await call(f, 'PATCH', `/withdrawals/${weeklyId}`, { status: 'rejected' })).status, 404)
  assert.equal((await User.findById(owner._id)).walletBalance, 1000)

  // Mark paid stores the UTR; a second decision is refused.
  r = await call(f, 'PATCH', `/withdrawals/${instant.id}`, { status: 'completed', utr: 'UTR123' })
  assert.equal(r.body.withdrawal.utr, 'UTR123')
  assert.equal((await call(f, 'PATCH', `/withdrawals/${instant.id}`, { status: 'rejected' })).status, 404)
  assert.equal((await User.findById(owner._id)).walletBalance, 1000)

  // Minimum is ₹100; more than the balance is refused (wallet has ₹1000 here).
  assert.equal((await call(o, 'POST', '/withdrawals', { amount: 99, method: 'instant' })).status, 400)
  r = await call(o, 'POST', '/withdrawals', { amount: 1001, method: 'instant' })
  assert.equal(r.status, 400)
  assert.match(r.body.error, /more than your wallet balance/)
  r = await call(o, 'POST', '/withdrawals', { amount: 100, method: 'instant' })
  assert.equal(r.status, 201)
  const smallId = r.body.withdrawal.id

  // Founder corrects the owner's UPI → the open request now pays the new UPI;
  // owners can't use this route.
  assert.equal((await call(o, 'PUT', `/withdrawals/owner/${owner._id}/payout-details`, { upi: 'x@okaxis' })).status, 403)
  r = await call(f, 'GET', `/withdrawals/owner/${owner._id}/payout-details`)
  assert.equal(r.body.payout.upi, 'ravi.k@okaxis')
  r = await call(f, 'PUT', `/withdrawals/owner/${owner._id}/payout-details`, { upi: 'ravi.new@okhdfcbank' })
  assert.deepEqual([r.status, r.body.openWithdrawalsUpdated], [200, 1])
  r = await call(f, 'GET', '/withdrawals/all')
  assert.equal(r.body.withdrawals.find((w) => w.id === smallId).destination.upi, 'ravi.new@okhdfcbank')

  // Paying it tells the owner how much went where.
  await call(f, 'PATCH', `/withdrawals/${smallId}`, { status: 'completed', utr: 'UTR777' })
  const { Notification } = await import('../models/Notification.js')
  const paidNote = await Notification.findOne({ title: 'Withdrawal paid' }).sort({ _id: -1 })
  assert.match(paidNote.body, /₹93 has been sent to UPI ravi\.new@okhdfcbank \(ref UTR777\)/)

  /* ---- Weekly auto payout (Sunday 9 PM IST sweep) ---- */
  const { runWeeklyPayouts } = await import('../routes/withdrawals.routes.js')
  const { Withdrawal } = await import('../models/Withdrawal.js')
  await Withdrawal.syncIndexes()
  const [noDetails, small] = await User.create([
    { phone: '9000000003', name: 'No UPI', role: 'owner', walletBalance: 800 },
    { phone: '9000000004', name: 'Small', role: 'owner', walletBalance: 50, payout: { upi: 's@okaxis' } },
  ])
  await User.updateOne({ _id: owner._id }, { walletBalance: 2500 })

  // Cron endpoint: refused without the secret, runs with it.
  assert.equal((await call('x', 'GET', '/withdrawals/weekly-run')).status, 401)
  env.cronSecret = 'test-secret'
  assert.equal((await call('wrong', 'GET', '/withdrawals/weekly-run')).status, 401)
  assert.equal((await call(o, 'POST', '/withdrawals/weekly-run')).status, 403)

  // Sunday 4 Oct 2026, 9 PM IST → due Monday 9 AM IST.
  const sunday = new Date('2026-10-04T15:30:00Z')
  const [a1, a2] = await Promise.all([runWeeklyPayouts(sunday), runWeeklyPayouts(sunday)]) // double-fire
  assert.equal(a1.created + a2.created, 1)
  const weekly = await Withdrawal.find({ owner: owner._id, method: 'weekly' })
  assert.equal(weekly.length, 1)
  assert.deepEqual([weekly[0].amount, weekly[0].fee, weekly[0].net, weekly[0].status], [2500, 100, 2400, 'pending'])
  assert.equal(weekly[0].week, '2026-10-04')
  assert.equal(weekly[0].dueBy.toISOString(), '2026-10-05T03:30:00.000Z')
  assert.equal(weekly[0].destination.upi, 'ravi.new@okhdfcbank')
  assert.equal((await User.findById(owner._id)).walletBalance, 0)
  // No UPI → held (money stays, owner told); under ₹100 → carried over.
  assert.equal((await User.findById(noDetails._id)).walletBalance, 800)
  assert.ok(await Notification.exists({ audience: `owner:${noDetails._id}`, title: 'Weekly payout on hold' }))
  assert.equal((await User.findById(small._id)).walletBalance, 50)
  assert.ok(await Notification.exists({ audience: 'founder', title: 'Weekly payouts ready' }))

  // The real cron route runs; nobody left above the minimum → nothing new.
  r = await fetch(`${base}/withdrawals/weekly-run`, { headers: { Authorization: 'Bearer test-secret' } })
  assert.equal(r.status, 200)
  assert.equal((await Withdrawal.countDocuments({ method: 'weekly' })), 1)

  console.log('withdrawals: all checks passed')
} finally {
  server.close()
  await disconnectDB()
}
