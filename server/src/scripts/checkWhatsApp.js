/**
 * Self-check for the WhatsApp booking confirmation. In-memory DB, and every
 * MSG91 call is captured by a fake fetch — nothing is really sent:
 *   node src/scripts/checkWhatsApp.js
 */
import assert from 'node:assert/strict'
process.env.MONGODB_URI = '' // never touch a real database
process.env.MSG91_AUTHKEY = 'test-key' // fake: fetch to MSG91 is intercepted below
process.env.MSG91_WA_NUMBER = '+91 70800 76830'
process.env.MSG91_WA_BOOKING_TEMPLATE = 'booking_confirmed'
process.env.RAZORPAY_KEY_ID = ''
const { env } = await import('../config/env.js')
assert.equal(env.mongoUri, '', 'refusing to run against a real database')

const sent = []
const realFetch = globalThis.fetch
globalThis.fetch = async (url, opts) => {
  if (String(url).includes('msg91.com')) {
    sent.push({ url: String(url), headers: opts.headers, body: JSON.parse(opts.body) })
    return new Response(JSON.stringify({ type: 'success' }))
  }
  return realFetch(url, opts)
}

const { createApp } = await import('../app.js')
const { User } = await import('../models/User.js')
const { createBookingRecord } = await import('../routes/bookings.routes.js')
const { sendWhatsApp } = await import('../lib/sms/flow.js')
const { signToken } = await import('../lib/jwt.js')
const { connectDB, disconnectDB } = await import('../config/db.js')

const server = createApp().listen(0)
const base = `http://127.0.0.1:${server.address().port}/api`
const call = async (token, method, path, body) => {
  const res = await realFetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body && JSON.stringify(body),
  })
  return { status: res.status, body: await res.json().catch(() => null) }
}

try {
  await connectDB()
  const owner = await User.create({ phone: '9000000071', name: 'Owner', role: 'owner' })
  const founder = await User.create({ phone: '9000000072', name: 'Founder', role: 'founder' })
  const cust = await User.create({ phone: '9000000073', name: 'Priya Sharma' })
  let r = await call(signToken(owner), 'POST', '/salons', {
    name: 'WA Salon', category: 'mens', city: 'lucknow', area: 'Aliganj', address: 'Sector H, Aliganj',
    serviceModes: ['salon'], capacity: 2, services: [{ name: 'Haircut', amount: 300, mins: 30 }],
  })
  const salon = r.body.salon
  await call(signToken(founder), 'PATCH', `/salons/${salon.id}/status`, { status: 'approved' })
  const svc = (await call(signToken(cust), 'GET', `/services?salon=${salon.id}`)).body
  const date = new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10)

  sent.length = 0
  const booking = await createBookingRecord(cust, {
    salonId: salon.id, serviceIds: [(svc.services ?? svc)[0].id], mode: 'salon',
    date, dateLabel: 'Fri 9 Oct', slot: '16:30', paymentMode: 'offline',
  })

  // Exactly one WhatsApp message, to the customer, with the 5 template values.
  const wa = sent.filter((s) => s.url.includes('/whatsapp/'))
  assert.equal(wa.length, 1)
  assert.equal(wa[0].url, 'https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/')
  assert.equal(wa[0].headers.authkey, 'test-key')
  const { integrated_number: from, content_type: type, payload } = wa[0].body
  assert.deepEqual([from, type, payload.type, payload.template.name], ['917080076830', 'template', 'template', 'booking_confirmed'])
  assert.deepEqual(payload.template.language, { code: 'en', policy: 'deterministic' })
  const [rcpt] = payload.template.to_and_components
  assert.deepEqual(rcpt.to, ['919000000073'])
  assert.deepEqual(Object.values(rcpt.components).map((c) => c.value), [
    'Priya Sharma', booking.ref, 'Haircut', 'Fri 9 Oct, 4:30 PM', booking.completionOtp,
  ])
  assert.deepEqual(Object.keys(rcpt.components), ['body_1', 'body_2', 'body_3', 'body_4', 'body_5'])

  // Not configured → skipped quietly; a provider failure never throws.
  sent.length = 0
  env.msg91.waBookingTemplate = ''
  await sendWhatsApp({ template: env.msg91.waBookingTemplate, phone: cust.phone, params: ['x'] })
  assert.equal(sent.length, 0)
  globalThis.fetch = async () => { throw new Error('network down') }
  await sendWhatsApp({ template: 'booking_confirmed', phone: cust.phone, params: ['x'] })

  console.log('whatsapp: all checks passed')
} finally {
  globalThis.fetch = realFetch
  server.close()
  await disconnectDB()
}
