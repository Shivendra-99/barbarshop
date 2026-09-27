/**
 * Self-check for owner withdrawals + founder payouts. In-memory DB only:
 *   MONGODB_URI= node src/scripts/checkWithdrawals.js
 */
import assert from 'node:assert/strict'
process.env.MONGODB_URI = '' // never touch a real database
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
  let r = await call(o, 'POST', '/withdrawals', { amount: 1000, method: 'weekly' })
  assert.equal(r.status, 400)
  assert.match(r.body.error, /UPI/)

  // Bad UPI, half a bank account → rejected; valid UPI → saved (normalised).
  assert.equal((await call(o, 'PUT', '/withdrawals/payout-details', { upi: 'nope' })).status, 400)
  assert.equal((await call(o, 'PUT', '/withdrawals/payout-details', { accountNumber: '123456789' })).status, 400)
  r = await call(o, 'PUT', '/withdrawals/payout-details', { upi: ' Ravi.K@OKAXIS ', accountName: '', accountNumber: '', ifsc: '' })
  assert.equal(r.status, 200)
  assert.equal(r.body.payout.upi, 'ravi.k@okaxis')

  // Weekly = 4%: ₹1000 → fee ₹40, owner gets ₹960; wallet debited the gross.
  r = await call(o, 'POST', '/withdrawals', { amount: 1000, method: 'weekly' })
  assert.equal(r.status, 201)
  assert.deepEqual([r.body.withdrawal.fee, r.body.withdrawal.net, r.body.balance], [40, 960, 500])
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

  console.log('withdrawals: all checks passed')
} finally {
  server.close()
  await disconnectDB()
}
