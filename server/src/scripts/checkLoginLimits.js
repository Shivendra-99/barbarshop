/**
 * Self-check for the login limits (3 OTPs per 15 min, 3 wrong codes → lock)
 * and for creating a salon with all settings. In-memory DB, no real SMS:
 *   node src/scripts/checkLoginLimits.js
 */
import assert from 'node:assert/strict'
process.env.MONGODB_URI = '' // never touch a real database
process.env.MSG91_AUTHKEY = '' // dev OTP flow, never real SMS
process.env.MSG91_TEMPLATE_ID = ''
process.env.OTP_DEV_RETURN = 'true'
const { env } = await import('../config/env.js')
assert.equal(env.mongoUri, '', 'refusing to run against a real database')
const { createApp } = await import('../app.js')
const { User } = await import('../models/User.js')
const { signToken } = await import('../lib/jwt.js')
const { connectDB, disconnectDB } = await import('../config/db.js')

const server = createApp().listen(0)
const base = `http://127.0.0.1:${server.address().port}/api`
const call = async (method, path, body, token = '') => {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body && JSON.stringify(body),
  })
  return { status: res.status, body: await res.json().catch(() => null) }
}

try {
  await connectDB()

  // ---- 3 OTP sends per 15 minutes, shared by the server and widget flows ----
  const phone = '9123456780'
  assert.equal((await call('POST', '/auth/request-otp', { phone })).status, 200)
  assert.equal((await call('POST', '/auth/otp-attempt', { phone })).status, 200)
  assert.equal((await call('POST', '/auth/request-otp', { phone })).status, 200)
  let r = await call('POST', '/auth/otp-attempt', { phone })
  assert.equal(r.status, 429)
  assert.match(r.body.error, /only 3 OTPs in 15 minutes/)
  assert.equal((await call('POST', '/auth/request-otp', { phone })).status, 429)
  // Another number is unaffected.
  assert.equal((await call('POST', '/auth/otp-attempt', { phone: '9123456781' })).status, 200)

  // ---- 3 wrong codes → locked (still works alongside the send limit) ----
  const p2 = '9123456782'
  const { body: sent } = await call('POST', '/auth/request-otp', { phone: p2 })
  const wrong = sent.devCode === '000000' ? '111111' : '000000'
  assert.equal((await call('POST', '/auth/verify-otp', { phone: p2, code: wrong })).status, 400)
  assert.equal((await call('POST', '/auth/verify-otp', { phone: p2, code: wrong })).status, 400)
  assert.equal((await call('POST', '/auth/verify-otp', { phone: p2, code: wrong })).status, 429)
  assert.equal((await call('POST', '/auth/otp-attempt', { phone: p2 })).status, 429) // locked

  // ---- Add salon with every setting, an exact pin and a ~300 KB photo ----
  const owner = await User.create({ phone: '9000000041', name: 'Owner', role: 'owner' })
  const photo = 'data:image/jpeg;base64,' + 'A'.repeat(300_000)
  r = await call(
    'POST',
    '/salons',
    {
      name: 'Pin Test Salon',
      category: 'mens',
      city: 'lucknow',
      area: 'Aliganj',
      address: 'Sector H, Aliganj, Lucknow',
      serviceModes: ['salon'],
      services: [{ name: 'Haircut', amount: 200, mins: 30 }],
      slotMinutes: 20,
      capacity: 3,
      daysOff: [1],
      closedDates: ['2026-10-20'],
      offerActive: true,
      offerPercent: 10,
      mapPin: { lat: 26.89, lng: 80.94 },
      photo,
    },
    signToken(owner),
  )
  assert.equal(r.status, 201, JSON.stringify(r.body))
  const s = r.body.salon
  assert.deepEqual(
    [s.slotMinutes, s.capacity, s.daysOff, s.closedDates, s.offerActive, s.offerPercent, s.status],
    [20, 3, [1], ['2026-10-20'], true, 10, 'pending'],
  )
  assert.equal(s.photo.length, photo.length)
  assert.deepEqual([s.location.lat, s.location.lng, s.location.source], [26.89, 80.94, 'pin'])

  console.log('login limits + salon create: all checks passed')
} finally {
  server.close()
  await disconnectDB()
}
