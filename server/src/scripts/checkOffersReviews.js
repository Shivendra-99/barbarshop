/**
 * Self-check for the founder-set first-booking %, public coupon codes and
 * website (SalonSaathi) ratings. In-memory DB only:
 *   node src/scripts/checkOffersReviews.js
 */
import assert from 'node:assert/strict'
process.env.MONGODB_URI = '' // never touch a real database
process.env.MSG91_AUTHKEY = '' // never send real SMS
const { env } = await import('../config/env.js')
assert.equal(env.mongoUri, '', 'refusing to run against a real database')
const { createApp } = await import('../app.js')
const { User } = await import('../models/User.js')
const { Coupon } = await import('../models/Coupon.js')
const { Notification } = await import('../models/Notification.js')
const { priceBookingDraft } = await import('../routes/bookings.routes.js')
const { signToken } = await import('../lib/jwt.js')
const { connectDB, disconnectDB } = await import('../config/db.js')

const server = createApp().listen(0)
const base = `http://127.0.0.1:${server.address().port}/api`
const call = async (token, method, path, body) => {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body && JSON.stringify(body),
  })
  return { status: res.status, body: await res.json().catch(() => null) }
}

try {
  await connectDB()
  const owner = await User.create({ phone: '9000000061', name: 'Owner', role: 'owner' })
  const founder = await User.create({ phone: '9000000062', name: 'Founder', role: 'founder' })
  const cust = await User.create({ phone: '9000000063', name: 'Priya Sharma' })
  const [o, f, c] = [owner, founder, cust].map(signToken)

  let r = await call(o, 'POST', '/salons', {
    name: 'Offer Salon', category: 'mens', city: 'lucknow', area: 'Aliganj', address: 'Sector H, Aliganj',
    serviceModes: ['salon'], capacity: 2, services: [{ name: 'Haircut', amount: 1000, mins: 30 }],
  })
  const salon = r.body.salon
  await call(f, 'PATCH', `/salons/${salon.id}/status`, { status: 'approved' })
  const svc = (await call(c, 'GET', `/services?salon=${salon.id}`)).body
  const serviceIds = [(svc.services ?? svc)[0].id]
  const draft = { salonId: salon.id, serviceIds, mode: 'salon', paymentMode: 'online' }
  const firstDiscount = async () => (await priceBookingDraft(cust, draft)).priced.discount

  /* First-booking % comes from settings: 10 by default, founder can change it. */
  r = await call(null, 'GET', '/settings')
  assert.equal(r.body.settings.firstBookingPercent, 10)
  assert.equal(await firstDiscount(), 100)
  assert.equal((await call(o, 'PATCH', '/settings', { firstBookingPercent: 20 })).status, 403)
  assert.equal((await call(f, 'PATCH', '/settings', { firstBookingPercent: 60 })).status, 400)
  r = await call(f, 'PATCH', '/settings', { firstBookingPercent: 20 })
  assert.equal(r.body.settings.firstBookingPercent, 20)
  assert.equal(await firstDiscount(), 200)
  await call(f, 'PATCH', '/settings', { firstBookingPercent: 0 })
  assert.equal(await firstDiscount(), 0)

  /* Public coupons: live platform + this salon's codes; no login needed. */
  const common = { type: 'percent', value: 20, createdBy: founder._id }
  await Coupon.create([
    { ...common, code: 'WELCOME20' },
    { ...common, code: 'OFFSALON', active: false },
    { ...common, code: 'USEDUP', usageLimit: 5, usedCount: 5 },
    { ...common, code: 'EXPIRED', validTo: new Date(Date.now() - 864e5) },
    { ...common, code: 'SALON15', value: 15, salon: salon.id, createdBy: owner._id },
  ])
  r = await call(null, 'GET', '/coupons/public')
  assert.deepEqual(r.body.coupons.map((x) => x.code), ['WELCOME20'])
  r = await call(null, 'GET', `/coupons/public?salonId=${salon.id}`)
  assert.deepEqual(r.body.coupons.map((x) => x.code).sort(), ['SALON15', 'WELCOME20'])

  /* First-booking-only coupon: new customers only, and labelled so on the card. */
  await Coupon.create({ ...common, code: 'FIRST10', value: 10, maxDiscount: 100, firstBookingOnly: true })
  r = await call(null, 'GET', '/coupons/public')
  assert.equal(r.body.coupons.find((x) => x.code === 'FIRST10').firstBookingOnly, true)
  const withCode = { ...draft, couponCode: 'FIRST10' }
  assert.equal((await priceBookingDraft(cust, withCode)).priced.couponDiscount, 100) // never booked: ok
  r = await call(c, 'GET', `/coupons/available?salonId=${salon.id}`)
  assert.ok(r.body.coupons.some((x) => x.code === 'FIRST10'))
  const { Booking } = await import('../models/Booking.js')
  await Booking.collection.insertOne({ customer: cust._id, status: 'cancelled' }) // any past booking counts
  await assert.rejects(priceBookingDraft(cust, withCode), /only for your first booking/)
  r = await call(c, 'GET', `/coupons/available?salonId=${salon.id}`)
  assert.ok(!r.body.coupons.some((x) => x.code === 'FIRST10'))

  /* Website ratings. */
  assert.equal((await call(null, 'PUT', '/site-reviews', { rating: 5 })).status, 401)
  assert.equal((await call(c, 'PUT', '/site-reviews', { rating: 6 })).status, 400)
  r = await call(c, 'GET', '/site-reviews/mine')
  assert.equal(r.body.review, null)
  assert.equal((await call(c, 'PUT', '/site-reviews', { rating: 5, comment: 'Booking took 1 minute!' })).status, 200)
  assert.equal((await call(c, 'PUT', '/site-reviews', { rating: 4, comment: 'Booking took 1 minute!' })).status, 200)
  assert.equal((await call(o, 'PUT', '/site-reviews', { rating: 3 })).status, 200)
  r = await call(null, 'GET', '/site-reviews')
  assert.deepEqual([r.body.avg, r.body.count], [3.5, 2])
  assert.deepEqual(r.body.recent, [{ name: 'Priya', rating: 4, comment: 'Booking took 1 minute!', ts: r.body.recent[0].ts }])
  assert.equal(r.body.recent[0].phone, undefined) // no phone numbers on the public list
  r = await call(c, 'GET', '/site-reviews/mine')
  assert.deepEqual(r.body.review, { rating: 4, comment: 'Booking took 1 minute!' })
  assert.equal((await call(c, 'GET', '/site-reviews/all')).status, 403)
  r = await call(f, 'GET', '/site-reviews/all')
  assert.equal(r.body.reviews.length, 2)
  assert.equal(r.body.reviews.find((x) => x.rating === 4).user.phone, '9000000063')
  // The founder hears about each new rater once, not on every edit.
  assert.equal(await Notification.countDocuments({ audience: 'founder', title: /New website rating/ }), 2)

  console.log('offers + site reviews: all checks passed')
} finally {
  server.close()
  await disconnectDB()
}
