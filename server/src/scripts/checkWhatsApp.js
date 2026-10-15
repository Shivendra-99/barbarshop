/**
 * Self-check for the WhatsApp messages (booking, new-booking alert, completed,
 * both cancellations, payout). In-memory DB, and every
 * MSG91 call is captured by a fake fetch — nothing is really sent:
 *   node src/scripts/checkWhatsApp.js
 */
import assert from 'node:assert/strict'
process.env.MONGODB_URI = '' // never touch a real database
process.env.MSG91_AUTHKEY = 'test-key' // fake: fetch to MSG91 is intercepted below
process.env.MSG91_WA_NUMBER = '+91 70800 76830'
process.env.MSG91_WA_BOOKING_TEMPLATE = 'booking_confirmed'
process.env.MSG91_WA_NAMESPACE = 'fe37b378_2a79_431c_b224_a7b69f80a8b5'
process.env.MSG91_WA_OWNER_BOOKING_TEMPLATE = 'new_booking_owner'
process.env.MSG91_WA_COMPLETED_TEMPLATE = 'service_completed'
process.env.MSG91_WA_OWNER_CANCEL_TEMPLATE = 'booking_cancelled_owner'
process.env.MSG91_WA_SALON_CANCEL_TEMPLATE = 'booking_cancelled_by_salon'
process.env.MSG91_WA_PAYOUT_TEMPLATE = 'payout_sent'
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

  // WhatsApp messages sent since the last reset, keyed by template name.
  const waBy = (name) => sent.filter((s) => s.url.includes('/whatsapp/') && s.body.payload.template.name === name)
  const values = (m) => {
    const [r] = m.body.payload.template.to_and_components
    return { to: r.to[0], ...Object.fromEntries(Object.entries(r.components).map(([k, c]) => [k.slice(5), c.value])) }
  }

  // Booking: one confirmation to the customer, one alert to the owner.
  const wa = waBy('booking_confirmed')
  assert.equal(wa.length, 1)
  assert.equal(sent.filter((s) => s.url.includes('/whatsapp/')).length, 2)
  assert.deepEqual(values(waBy('new_booking_owner')[0]), {
    to: '919000000071', booking_id: booking.ref, customer_name: 'Priya Sharma',
    service: 'Haircut', date_time: 'Fri 9 Oct, 4:30 PM', amount: String(booking.total),
  })
  assert.equal(wa[0].url, 'https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/')
  assert.equal(wa[0].headers.authkey, 'test-key')
  const { integrated_number: from, content_type: type, payload } = wa[0].body
  assert.deepEqual([from, type, payload.type, payload.template.name], ['917080076830', 'template', 'template', 'booking_confirmed'])
  assert.equal(payload.template.namespace, 'fe37b378_2a79_431c_b224_a7b69f80a8b5')
  assert.deepEqual(payload.template.language, { code: 'en', policy: 'deterministic' })
  const [rcpt] = payload.template.to_and_components
  assert.deepEqual(rcpt.to, ['919000000073'])
  // Keys and parameter names exactly as MSG91's Code { JSON } for booking_confirmed lists them.
  assert.deepEqual(rcpt.components, {
    body_customer_name: { type: 'text', value: 'Priya Sharma', parameter_name: 'customer_name' },
    body_booking_id: { type: 'text', value: booking.ref, parameter_name: 'booking_id' },
    body_service: { type: 'text', value: 'Haircut', parameter_name: 'service' },
    body_date_time: { type: 'text', value: 'Fri 9 Oct, 4:30 PM', parameter_name: 'date_time' },
    body_service_code: { type: 'text', value: booking.completionOtp, parameter_name: 'service_code' },
  })

  const o = signToken(owner)
  const c = signToken(cust)
  const book = (slot) => createBookingRecord(cust, {
    salonId: salon.id, serviceIds: [(svc.services ?? svc)[0].id], mode: 'salon',
    date, dateLabel: 'Fri 9 Oct', slot, paymentMode: 'offline',
  })

  // Completed → customer.
  sent.length = 0
  assert.equal((await call(o, 'PATCH', `/bookings/${booking._id}/complete`, { otp: booking.completionOtp })).status, 200)
  assert.deepEqual(values(waBy('service_completed')[0]), { to: '919000000073', booking_id: booking.ref })

  // Customer cancels → owner.
  const b2 = await book('17:30')
  sent.length = 0
  assert.equal((await call(c, 'POST', `/bookings/${b2._id}/cancel`, { method: 'wallet' })).status, 200)
  assert.deepEqual(values(waBy('booking_cancelled_owner')[0]), {
    to: '919000000071', booking_id: b2.ref, customer_name: 'Priya Sharma', service: 'Haircut', date_time: 'Fri 9 Oct, 5:30 PM',
  })

  // Salon cancels → customer, with the reason.
  const b3 = await book('18:30')
  sent.length = 0
  assert.equal((await call(o, 'POST', `/bookings/${b3._id}/cancel-by-owner`, { reason: 'Salon closed unexpectedly' })).status, 200)
  assert.deepEqual(values(waBy('booking_cancelled_by_salon')[0]), {
    to: '919000000073', customer_name: 'Priya Sharma', booking_id: b3.ref, service: 'Haircut',
    date_time: 'Fri 9 Oct, 6:30 PM', reason: 'Salon closed unexpectedly',
  })

  // Payout marked paid → owner.
  const { Withdrawal } = await import('../models/Withdrawal.js')
  const w = await Withdrawal.create({
    owner: owner._id, amount: 3000, fee: 120, net: 2880, method: 'weekly', status: 'pending',
    destination: { upi: 'rakesh@okhdfcbank' },
  })
  sent.length = 0
  assert.equal((await call(signToken(founder), 'PATCH', `/withdrawals/${w._id}`, { status: 'completed', utr: 'UTR42' })).status, 200)
  assert.deepEqual(values(waBy('payout_sent')[0]), {
    to: '919000000071', owner_name: 'Owner', amount: '2880', destination: 'UPI rakesh@okhdfcbank', reference: 'UTR42',
  })

  // Not configured → skipped quietly; a provider failure never throws.
  sent.length = 0
  env.msg91.waBookingTemplate = ''
  await sendWhatsApp({ template: env.msg91.waBookingTemplate, phone: cust.phone, params: { x: 'x' } })
  assert.equal(sent.length, 0)
  globalThis.fetch = async () => { throw new Error('network down') }
  await sendWhatsApp({ template: 'booking_confirmed', phone: cust.phone, params: { x: 'x' } })

  console.log('whatsapp: all checks passed')
} finally {
  globalThis.fetch = realFetch
  server.close()
  await disconnectDB()
}
