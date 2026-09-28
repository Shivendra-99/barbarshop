/**
 * Self-check for salon staff: owners set the team; customers pick a person;
 * the same person can't be booked twice for one slot. In-memory DB only:
 *   node src/scripts/checkStaff.js
 */
import assert from 'node:assert/strict'
process.env.MONGODB_URI = '' // never touch a real database
process.env.MSG91_AUTHKEY = '' // never send real SMS
process.env.RAZORPAY_KEY_ID = '' // cash bookings only here
const { env } = await import('../config/env.js')
assert.equal(env.mongoUri, '', 'refusing to run against a real database')
const { createApp } = await import('../app.js')
const { User } = await import('../models/User.js')
const { Booking } = await import('../models/Booking.js')
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
  await Booking.syncIndexes() // the per-staff unique index
  const owner = await User.create({ phone: '9000000051', name: 'Owner', role: 'owner' })
  const founder = await User.create({ phone: '9000000052', name: 'Founder', role: 'founder' })
  const [a, b] = await User.create([
    { phone: '9000000053', name: 'Cust A' },
    { phone: '9000000054', name: 'Cust B' },
  ])
  const o = signToken(owner)
  const f = signToken(founder)

  // Duplicate names are refused.
  const salonBody = (staff) => ({
    name: 'Team Salon', category: 'mens', city: 'lucknow', area: 'Aliganj', address: 'Sector H, Aliganj',
    serviceModes: ['salon'], capacity: 3, services: [{ name: 'Haircut', amount: 200, mins: 30 }], staff,
  })
  let r = await call(o, 'POST', '/salons', salonBody([{ name: 'Ramesh' }, { name: 'ramesh' }]))
  assert.equal(r.status, 400)

  r = await call(o, 'POST', '/salons', salonBody([
    { name: 'Ramesh Kumar', role: 'Senior barber', years: 12 },
    { name: 'Suresh Yadav' },
  ]))
  assert.equal(r.status, 201)
  const salon = r.body.salon
  assert.deepEqual(salon.staff.map((s) => [s.name, s.role, s.years]), [
    ['Ramesh Kumar', 'Senior barber', 12],
    ['Suresh Yadav', '', null],
  ])
  await call(f, 'PATCH', `/salons/${salon.id}/status`, { status: 'approved' })
  const svc = (await call(a.phone && signToken(a), 'GET', `/services?salon=${salon.id}`)).body
  const serviceId = (svc.services ?? svc)[0].id

  const d = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10)
  const book = (u, staffName, slot) =>
    call(signToken(u), 'POST', '/bookings', {
      salonId: salon.id, serviceIds: [serviceId], mode: 'salon', date: d, slot, paymentMode: 'offline',
      ...(staffName ? { staffName } : {}),
    })

  // A books Ramesh at 11:00; B can't have Ramesh then, but can have Suresh.
  r = await book(a, 'Ramesh Kumar', '11:00 AM')
  assert.equal(r.status, 201)
  assert.equal(r.body.booking.staffName, 'Ramesh Kumar')
  const aBooking = r.body.booking.id
  r = await book(b, 'Ramesh Kumar', '11:00 AM')
  assert.equal(r.status, 409)
  assert.match(r.body.error, /Ramesh Kumar is already booked/)
  assert.equal((await book(b, 'Suresh Yadav', '11:00 AM')).status, 201)
  // A name not on the team is refused; "any professional" still works.
  assert.equal((await book(b, 'Mystery Barber', '12:00 PM')).status, 400)
  assert.equal((await book(b, null, '11:00 AM')).status, 201)

  // Availability tells the Book page who is taken when.
  r = await call(signToken(b), 'GET', `/bookings/availability?salon=${salon.id}&date=${d}`)
  assert.deepEqual(r.body.staffTaken['11:00 AM'].sort(), ['Ramesh Kumar', 'Suresh Yadav'])

  // Reschedule onto a time Ramesh is busy → refused; a free time → fine.
  const c = await User.create({ phone: '9000000055', name: 'Cust C' })
  assert.equal((await book(c, 'Ramesh Kumar', '12:00 PM')).status, 201)
  r = await call(signToken(a), 'PATCH', `/bookings/${aBooking}/reschedule`, { date: d, slot: '12:00 PM' })
  assert.equal(r.status, 409)
  r = await call(signToken(a), 'PATCH', `/bookings/${aBooking}/reschedule`, { date: d, slot: '1:00 PM' })
  assert.equal(r.status, 200)

  // Editing the team keeps existing members' ids.
  const ramesh = salon.staff[0]
  r = await call(o, 'PATCH', `/salons/${salon.id}`, {
    staff: [{ id: ramesh.id, name: 'Ramesh Kumar', role: 'Master barber', years: 13 }, { name: 'Imran Ali' }],
  })
  assert.equal(r.status, 200)
  assert.equal(r.body.salon.staff[0].id, ramesh.id)
  assert.deepEqual(r.body.salon.staff.map((s) => s.name), ['Ramesh Kumar', 'Imran Ali'])

  console.log('staff: all checks passed')
} finally {
  server.close()
  await disconnectDB()
}
