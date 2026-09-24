import { Router } from 'express'
import mongoose from 'mongoose'
import { z } from 'zod'
import { Booking } from '../models/Booking.js'
import { Salon } from '../models/Salon.js'
import { Service } from '../models/Service.js'
import { User } from '../models/User.js'
import { WalletTxn } from '../models/WalletTxn.js'
import { quote, refundFor, noShowRefund, ownerCancelRefund } from '../lib/pricing.js'
import { resolveCoupon, couponForQuote, redeemCoupon } from '../lib/coupons.js'
import { validate } from '../middleware/validate.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { asyncHandler, ApiError } from '../middleware/error.js'
import { notify } from '../lib/notify.js'
import { sendFlowSms, resolveOwnerPhones, bookingWhen } from '../lib/sms/flow.js'
import { env, razorpayEnabled } from '../config/env.js'
import { refundPayment } from '../lib/razorpay.js'
import { formatINR } from '../lib/money.js'
import { geocode } from '../lib/geo/mappls.js'

const router = Router()

/**
 * For a UPI/bank refund on a real online payment, issue it via Razorpay back to
 * the original payment source. Mutates `refund` with the gateway refund id and
 * final status. Never throws — a gateway hiccup leaves the refund 'processing'
 * for manual settlement so the cancellation itself still succeeds. Wallet and
 * cash refunds are handled by the caller and skipped here.
 */
/** True only when a refund should be pushed to the original source via Razorpay:
 * a positive UPI/bank refund on a real, gateway-paid online booking. Wallet,
 * cash, zero-amount and demo (no paymentId) refunds are handled elsewhere. */
export const shouldSourceRefund = (booking, refund) =>
  refund?.method === 'upi' &&
  refund.amount > 0 &&
  booking?.paymentMode === 'online' &&
  Boolean(booking?.razorpay?.paymentId)

async function issueSourceRefund(booking, refund, reason) {
  if (!shouldSourceRefund(booking, refund) || !razorpayEnabled()) {
    return refund
  }
  try {
    const rf = await refundPayment({
      paymentId: booking.razorpay.paymentId,
      amount: refund.amount,
      notes: { ref: booking.ref, reason },
    })
    refund.id = rf.id
    // Razorpay 'processed' = done; 'pending' = still settling to the source.
    refund.status = rf.status === 'processed' ? 'completed' : 'processing'
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log(`[refund] source refund failed for ${booking.ref}:`, err.message)
  }
  return refund
}

export const createSchema = z
  .object({
    salonId: z.string().min(1),
    // Single service (legacy) …
    serviceId: z.string().min(1).optional(),
    // … or a cart of services booked together. At least one is required.
    serviceIds: z.array(z.string().min(1)).min(1).max(10).optional(),
    staffName: z.string().trim().max(60).nullish(),
    mode: z.enum(['salon', 'home']),
    // null/omitted for at-salon; required (checked below) for home service.
    address: z.string().trim().min(6).max(200).nullish(),
    // Mappls eLoc for the address, when picked from autosuggest.
    addressELoc: z.string().trim().max(40).nullish(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date.'),
    dateLabel: z.string().optional(),
    slot: z.string().min(1),
    paymentMode: z.enum(['online', 'offline']),
    // Optional discount code — only honoured for online bookings.
    couponCode: z.string().trim().max(24).optional(),
  })
  .refine((b) => b.serviceId || (b.serviceIds && b.serviceIds.length), {
    message: 'Choose at least one service.',
    path: ['serviceIds'],
  })

const isObjectId = (v) => /^[a-f0-9]{24}$/i.test(v)

const makeRef = () => `SS${Math.floor(100000 + Math.random() * 899999)}`

/** A duplicate-key error specifically on the unique `ref` index (random ref
 * collision) — as opposed to the (salon,date,slot,seat) seat clash. */
export const isDuplicateRef = (err) =>
  err?.code === 11000 && (Boolean(err.keyPattern?.ref) || /index:\s*ref_/i.test(err.message || ''))

/**
 * How many confirmed bookings already hold a given salon/date/slot. Used to
 * enforce capacity so a slot can't be double-booked past the salon's chairs.
 * `excludeId` skips the booking being rescheduled.
 */
function equivalentSlots(slot) {
  if (!slot) return []
  const m = /^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i.exec(String(slot).trim())
  if (!m) return [slot]
  let h = Number(m[1])
  const min = Number(m[2])
  if (m[3]) {
    h = h % 12
    if (/PM/i.test(m[3])) h += 12
  }
  const minStr = String(min).padStart(2, '0')
  const h24 = `${String(h).padStart(2, '0')}:${minStr}`
  let h12 = h % 12
  if (h12 === 0) h12 = 12
  const period = h >= 12 ? 'PM' : 'AM'
  const h12Str = `${h12}:${minStr} ${period}`
  return Array.from(new Set([slot, h24, h12Str]))
}

async function slotTakenCount(salonId, date, slot, excludeId) {
  const eq = equivalentSlots(slot)
  const q = { salon: salonId, date, slot: eq.length > 1 ? { $in: eq } : slot, status: 'confirmed' }
  if (excludeId) q._id = { $ne: excludeId }
  return Booking.countDocuments(q)
}

/** Throw 409 if the slot is already full for this salon on this date. */
export async function assertSlotAvailable(salon, date, slot, excludeId) {
  const capacity = salon.capacity || 1
  const taken = await slotTakenCount(salon._id, date, slot, excludeId)
  if (taken >= capacity) {
    throw new ApiError(409, 'That time slot was just taken. Please choose another time.')
  }
}

const SLOT_FULL = 'That time slot was just taken. Please choose another time.'

/**
 * Find the first free seat (0 … capacity-1) for a salon/date/slot and create the
 * booking there. The partial unique index on (salon, date, slot, seat) makes
 * this race-proof: if two requests grab the same seat, one insert fails with a
 * duplicate-key error (11000) and we retry onto the next seat until the slot is
 * genuinely full (409).
 */
async function createInFreeSeat(fields, salon) {
  const capacity = salon.capacity || 1
  for (let attempt = 0; attempt < capacity + 3; attempt += 1) {
    const taken = await Booking.find({
      salon: salon._id,
      date: fields.date,
      slot: fields.slot,
      status: 'confirmed',
    }).distinct('seat')
    const seat = Array.from({ length: capacity }, (_, i) => i).find((i) => !taken.includes(i))
    if (seat === undefined) throw new ApiError(409, SLOT_FULL)
    try {
      return await Booking.create({ ...fields, seat })
    } catch (err) {
      // A random ref collision → get a fresh ref and retry. A seat clash
      // (someone booked it concurrently) → retry onto the next free seat.
      if (isDuplicateRef(err)) {
        fields.ref = makeRef()
        continue
      }
      if (err && err.code === 11000) continue
      throw err
    }
  }
  throw new ApiError(409, SLOT_FULL)
}

/**
 * Validate a booking draft, price it server-side, persist it, and fan out the
 * "new booking" notifications. Shared by the cash route (below) and the online
 * flow (payments.routes.js, after the Razorpay signature is verified).
 *
 * `payment` marks an already-captured online payment:
 *   { paid: true, orderId, paymentId } → paymentStatus 'paid'.
 * Omit it (or paid:false) for cash — collected at the salon later.
 * Returns the created Booking document.
 */
/**
 * Validate a booking draft against the salon/service and compute the
 * server-authoritative price. Shared by the order step (to know how much to
 * charge) and by createBookingRecord (to persist the same numbers). Never
 * trusts a client-supplied amount. Returns { salon, service, priced, homeServiceFee }.
 */
export async function priceBookingDraft(user, body) {
  const salon = await Salon.findById(body.salonId).catch(() => null)
  if (!salon || salon.status !== 'approved') {
    throw new ApiError(404, 'Salon not available.')
  }

  // Per-owner block: this salon's owner may have blocked the customer's number.
  const salonOwner = await User.findById(salon.owner).catch(() => null)
  if (salonOwner?.blockedCustomers?.includes(user.phone)) {
    throw new ApiError(
      403,
      'This salon is not accepting bookings from your number. Please contact the salon.',
    )
  }

  // One or many services (cart). De-dupe while preserving order.
  const ids = [...new Set(body.serviceIds?.length ? body.serviceIds : [body.serviceId])]
  if (!ids.length || ids.some((id) => !isObjectId(id))) throw new ApiError(400, 'Invalid service.')

  const found = await Service.find({ _id: { $in: ids } })
  // Keep the caller's order and reject anything missing or from another salon.
  const services = ids.map((id) => found.find((s) => s._id.toString() === id))
  if (services.some((s) => !s)) throw new ApiError(404, 'Service not found.')
  if (services.some((s) => s.salon.toString() !== salon._id.toString())) {
    throw new ApiError(400, 'A chosen service is not offered by this salon.')
  }

  if (!salon.serviceModes.includes(body.mode)) {
    throw new ApiError(400, `This salon does not offer ${body.mode} service.`)
  }
  if (body.mode === 'home' && !body.address) {
    throw new ApiError(400, 'A home-service booking needs an address.')
  }

  // First booking = the customer has never booked at all. Cancelled bookings
  // still count, so the discount can't be farmed by booking and cancelling.
  const priorCount = await Booking.countDocuments({ customer: user._id })
  const isFirstBooking = priorCount === 0

  const servicesTotal = services.reduce((sum, s) => sum + s.amount, 0)
  const items = services.map((s) => ({ name: s.name, amount: s.amount, mins: s.mins }))
  const serviceName = services.map((s) => s.name).join(' + ')

  const homeServiceFee = body.mode === 'home' ? salon.homeServiceFee : 0
  const offerPercent = salon.offerActive ? salon.offerPercent || 0 : 0

  // Coupons apply to online bookings only. resolveCoupon throws on an invalid
  // code; quote() then decides best-of (coupon vs the automatic discounts).
  let coupon = null
  if (body.couponCode && body.paymentMode === 'online') {
    coupon = await resolveCoupon({
      code: body.couponCode,
      salonId: salon._id,
      user,
      subtotal: servicesTotal,
    })
  }

  const priced = quote({
    amount: servicesTotal,
    paymentMode: body.paymentMode,
    isFirstBooking,
    homeServiceFee,
    offerPercent,
    coupon: couponForQuote(coupon),
  })

  return { salon, services, primary: services[0], items, serviceName, priced, homeServiceFee, coupon }
}

export async function createBookingRecord(user, body, payment = {}) {
  const { salon, primary, items, serviceName, priced, homeServiceFee, coupon } =
    await priceBookingDraft(user, body)

  // Geo reference for a home address: eLoc from the pick + lat/lng if the
  // geocoder can resolve them (null otherwise; never blocks the booking).
  let location = { eLoc: null, lat: null, lng: null }
  if (body.mode === 'home' && body.address) {
    const coords = await geocode({ eLoc: body.addressELoc, address: body.address })
    location = { eLoc: body.addressELoc ?? null, lat: coords?.lat ?? null, lng: coords?.lng ?? null }
  }

  const paidOnline = body.paymentMode === 'online' && payment.paid === true

  // Assigns a free seat and creates atomically (race-proof — see createInFreeSeat).
  const booking = await createInFreeSeat(
    {
      ref: makeRef(),
      completionOtp: String(Math.floor(1000 + Math.random() * 9000)),
      completionOtpVerified: false,
      customer: user._id,
      salon: salon._id,
      service: primary._id,
      items,
      salonName: salon.name,
      salonPhone: salon.phone || null,
      serviceName,
      staffName: body.staffName ?? null,
      mode: body.mode,
      modeLabel: body.mode === 'home' ? 'Home service' : 'At salon',
      address: body.mode === 'home' ? body.address : null,
      location,
      date: body.date,
      dateLabel: body.dateLabel ?? body.date,
      slot: body.slot,
      paymentMode: body.paymentMode,
      // Online is paid via the app upfront; cash is collected at the salon later.
      paymentStatus: paidOnline ? 'paid' : 'pending',
      paidAt: paidOnline ? new Date() : null,
      razorpay: {
        orderId: payment.orderId ?? null,
        paymentId: payment.paymentId ?? null,
      },
      homeServiceFee,
      ...priced,
      status: 'confirmed',
    },
    salon,
  )

  // Consume the coupon (once per booking) only when it actually applied.
  if (priced.couponDiscount > 0) {
    await redeemCoupon({
      coupon,
      user,
      booking,
      code: priced.couponCode,
      discount: priced.couponDiscount,
    })
  }

  // One booking event → three inboxes (customer, owner, founder).
  await notify([
    {
      audience: `user:${user._id.toString()}`,
      tone: 'success',
      title: 'Booking confirmed',
      body: `${serviceName} at ${salon.name} · ${booking.dateLabel}, ${booking.slot} (#${booking.ref}). Your service OTP is in My Bookings and your confirmation SMS.`,
    },
    {
      audience: `owner:${salon.owner.toString()}`,
      tone: 'info',
      title: 'New booking received',
      body: `${serviceName} · ${booking.dateLabel}, ${booking.slot} · ${booking.modeLabel}`,
    },
    {
      audience: 'founder',
      tone: 'info',
      title: 'New booking on platform',
      body: `${salon.name} · ${
        booking.paymentMode === 'online' ? 'Paid online' : 'Cash at salon'
      } ${formatINR(booking.total)}`,
    },
  ])

  // Await the SMS sends so they actually fire on serverless (Vercel freezes the
  // instance after the response, dropping any in-flight fetch). sendFlowSms never
  // throws, so a provider error still can't block or fail the booking.
  const when = bookingWhen(booking)
  const ownerPhones = await resolveOwnerPhones(salon)
  await Promise.allSettled([
    // Customer: booking confirmed + the completion OTP to share at the salon.
    sendFlowSms({
      flowId: env.msg91.bookingFlowId,
      phone: user.phone,
      vars: {
        CUSTOMER_NAME: user.name,
        REF: booking.ref,
        SERVICE: serviceName,
        WHEN: when,
        OTP: booking.completionOtp,
      },
      label: 'confirm',
    }),
    // Owner(s): new booking alert.
    ...ownerPhones.map((phone) =>
      sendFlowSms({
        flowId: env.msg91.ownerFlowId,
        phone,
        vars: {
          REF: booking.ref,
          CUSTOMER_NAME: user.name,
          SERVICE: serviceName,
          WHEN: when,
          TOTAL: String(booking.total || 0),
        },
        label: 'owner-new',
      }),
    ),
  ])

  return booking
}

/* ---- Customer: create a booking (cash, or online demo when Razorpay is off) ---- */

router.post(
  '/',
  requireAuth,
  requireRole('customer'),
  validate(createSchema),
  asyncHandler(async (req, res) => {
    // Customers blocked for cash abuse may only pay online.
    if (req.body.paymentMode === 'offline' && req.user.cashBlocked) {
      throw new ApiError(
        403,
        'Cash bookings are disabled on your account after repeated cancellations. Please pay online.',
      )
    }
    // Online here means the demo flow (no Razorpay configured): mark it paid.
    // With Razorpay on, the client routes online bookings through /api/payments
    // instead, so this path is cash — or the keyless demo — only.
    const paid = req.body.paymentMode === 'online'
    const booking = await createBookingRecord(req.user, req.body, { paid })
    res.status(201).json({ booking: booking.toPublic({ includeOtp: true }) })
  }),
)

/* ---- Slot availability for a salon on a date ---- */

router.get(
  '/availability',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { salon, date } = req.query
    if (!salon || !isObjectId(salon) || !/^\d{4}-\d{2}-\d{2}$/.test(date || '')) {
      throw new ApiError(400, 'A salon id and date are required.')
    }
    const salonDoc = await Salon.findById(salon).catch(() => null)
    if (!salonDoc) throw new ApiError(404, 'Salon not found.')

    // Confirmed bookings grouped by slot → how many hold each time.
    const rows = await Booking.aggregate([
      { $match: { salon: new mongoose.Types.ObjectId(salon), date, status: 'confirmed' } },
      { $group: { _id: '$slot', count: { $sum: 1 } } },
    ])
    const taken = {}
    rows.forEach((r) => {
      taken[r._id] = r.count
    })

    res.json({ capacity: salonDoc.capacity || 1, taken })
  }),
)

/* ---- Customer: reschedule a booking (change date/time only) ---- */

const rescheduleSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date.'),
  dateLabel: z.string().optional(),
  slot: z.string().min(1),
})

router.patch(
  '/:id/reschedule',
  requireAuth,
  requireRole('customer'),
  validate(rescheduleSchema),
  asyncHandler(async (req, res) => {
    const booking = await Booking.findById(req.params.id).catch(() => null)
    if (!booking) throw new ApiError(404, 'Booking not found.')
    if (booking.customer.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'That is not your booking.')
    }
    if (booking.status !== 'confirmed') {
      throw new ApiError(400, 'Only a confirmed booking can be rescheduled.')
    }

    // Rescheduling is allowed only up to 2 hours before the current appointment.
    const start = slotStartMsIST(booking.date, booking.slot)
    if (Number.isFinite(start) && Date.now() > start - 2 * 60 * 60 * 1000) {
      throw new ApiError(
        400,
        'Rescheduling is allowed only up to 2 hours before your appointment.',
      )
    }

    const salon = await Salon.findById(booking.salon).catch(() => null)
    const capacity = salon?.capacity || 1
    const newDate = req.body.date
    const newSlot = req.body.slot
    const newLabel = req.body.dateLabel ?? req.body.date

    // Move onto a free seat in the new slot (race-proof via the unique index).
    let saved = false
    for (let attempt = 0; attempt < capacity + 3 && !saved; attempt += 1) {
      const taken = await Booking.find({
        salon: booking.salon,
        date: newDate,
        slot: newSlot,
        status: 'confirmed',
        _id: { $ne: booking._id },
      }).distinct('seat')
      const seat = Array.from({ length: capacity }, (_, i) => i).find((i) => !taken.includes(i))
      if (seat === undefined) throw new ApiError(409, SLOT_FULL)
      booking.date = newDate
      booking.dateLabel = newLabel
      booking.slot = newSlot
      booking.seat = seat
      try {
        await booking.save()
        saved = true
      } catch (err) {
        if (err && err.code === 11000) continue // seat taken concurrently — retry
        throw err
      }
    }
    if (!saved) throw new ApiError(409, SLOT_FULL)

    await notify([
      {
        audience: `user:${req.user._id.toString()}`,
        tone: 'success',
        title: 'Booking rescheduled',
        body: `${booking.serviceName} · now ${booking.dateLabel}, ${booking.slot}`,
      },
      ...(salon
        ? [
            {
              audience: `owner:${salon.owner.toString()}`,
              tone: 'info',
              title: 'Booking rescheduled',
              body: `${booking.serviceName} · now ${booking.dateLabel}, ${booking.slot}`,
            },
          ]
        : []),
    ])

    // No SMS on reschedule — there's no DLT-approved template for it; the
    // in-app notification above keeps both sides informed.

    res.json({ booking: booking.toPublic({ includeOtp: true }) })
  }),
)

/* ---- Customer: live queue position for a booking ---- */

/** "11:00 AM" or "11:00" → minutes since midnight, for ordering the day's queue. */
function slotMinutes(slot) {
  const m = /^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i.exec((slot || '').trim())
  if (!m) return 0
  let h = Number(m[1])
  const min = Number(m[2])
  if (m[3]) {
    h = h % 12
    if (/PM/i.test(m[3])) h += 12
  }
  return h * 60 + min
}

router.get(
  '/:id/queue',
  requireAuth,
  asyncHandler(async (req, res) => {
    const booking = await Booking.findById(req.params.id).catch(() => null)
    if (!booking) throw new ApiError(404, 'Booking not found.')
    if (booking.customer.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'That is not your booking.')
    }

    // The live queue = still-confirmed, at-salon bookings for the same salon and
    // day. Served/cancelled bookings have already left, so counts drop live.
    const queue = await Booking.find({
      salon: booking.salon,
      date: booking.date,
      mode: 'salon',
      status: 'confirmed',
    }).select('slot createdAt')

    const mine = slotMinutes(booking.slot)
    const ahead = queue.filter((b) => {
      if (b._id.toString() === booking._id.toString()) return false
      const bm = slotMinutes(b.slot)
      if (bm !== mine) return bm < mine
      return new Date(b.createdAt) < new Date(booking.createdAt)
    }).length

    res.json({
      inQueue: booking.status === 'confirmed' && booking.mode === 'salon',
      status: booking.status,
      ahead,
      position: ahead + 1,
      total: queue.length,
    })
  }),
)

/* ---- Customer: rate the salon for a booking ---- */

const rateSchema = z.object({
  rating: z.number().int().min(1).max(5),
  review: z.string().trim().max(500).optional().default(''),
})

router.post(
  '/:id/rate',
  requireAuth,
  requireRole('customer'),
  validate(rateSchema),
  asyncHandler(async (req, res) => {
    const booking = await Booking.findById(req.params.id).catch(() => null)
    if (!booking) throw new ApiError(404, 'Booking not found.')
    if (booking.customer.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'That is not your booking.')
    }
    if (booking.status === 'cancelled') throw new ApiError(400, 'You can’t rate a cancelled booking.')

    booking.rating = req.body.rating
    booking.review = req.body.review ?? ''
    await booking.save()

    // Recompute the salon's average rating from all rated bookings.
    const [agg] = await Booking.aggregate([
      { $match: { salon: booking.salon, rating: { $ne: null } } },
      { $group: { _id: '$salon', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ])
    if (agg) {
      await Salon.updateOne(
        { _id: booking.salon },
        { rating: Math.round(agg.avg * 10) / 10, reviews: agg.count },
      )
    }

    res.json({ booking: booking.toPublic({ includeOtp: true }) })
  }),
)

/* ---- Owner: mark a pay-at-salon booking as paid (after the service) ---- */

const completeSchema = z.object({ otp: z.string().trim().optional() })

router.patch(
  '/:id/complete',
  requireAuth,
  requireRole('owner'),
  validate(completeSchema),
  asyncHandler(async (req, res) => {
    const booking = await Booking.findById(req.params.id).catch(() => null)
    if (!booking) throw new ApiError(404, 'Booking not found.')

    const owns = await Salon.exists({ _id: booking.salon, owner: req.user._id })
    if (!owns) throw new ApiError(403, 'That booking is not for your salon.')

    if (booking.status === 'cancelled') throw new ApiError(400, 'This booking was cancelled.')
    if (booking.status === 'completed') throw new ApiError(400, 'This booking is already completed.')

    // OTP proof of service: the customer reads out their 4-digit code. (Legacy
    // bookings created before OTP have none — those complete without it.)
    if (booking.completionOtp) {
      const otp = (req.body.otp || '').trim()
      if (!otp) throw new ApiError(400, 'Enter the customer’s OTP to complete this booking.')
      if (otp !== booking.completionOtp) throw new ApiError(400, 'Incorrect OTP. Ask the customer to re-check.')
      booking.completionOtpVerified = true
    }

    const cash = booking.paymentMode === 'offline'
    // Offline: record the cash payment. Online: already paid, just mark served.
    if (cash) {
      booking.paymentStatus = 'paid'
      booking.paidAt = new Date()
    }
    booking.status = 'completed'
    await booking.save()

    // A completed cash service clears the customer's cash-cancel strikes.
    if (cash) {
      await User.updateOne(
        { _id: booking.customer },
        { cashCancelCount: 0, cashBlocked: false },
      )
    }

    // Online money was settled to the platform on booking — on completion it
    // becomes the owner's withdrawable balance (their payout). Cash the owner
    // already has in hand, so no wallet movement there.
    if (!cash && booking.salonPayout > 0) {
      const owner = await User.findById(req.user._id)
      const balanceAfter = (owner.walletBalance || 0) + booking.salonPayout
      await User.updateOne({ _id: owner._id }, { walletBalance: balanceAfter })
      await WalletTxn.create({
        user: owner._id,
        type: 'credit',
        amount: booking.salonPayout,
        note: `Payout for ${booking.serviceName}`,
        bookingRef: booking.ref,
        balanceAfter,
      })
    }

    await notify([
      {
        audience: `user:${booking.customer.toString()}`,
        tone: 'success',
        title: cash ? 'Payment received' : 'Service completed',
        body: cash
          ? `${booking.serviceName} at ${booking.salonName} — ${formatINR(booking.total)} paid at the salon.`
          : `${booking.serviceName} at ${booking.salonName} is complete. Thanks for visiting!`,
      },
      {
        audience: `owner:${req.user._id.toString()}`,
        tone: 'success',
        title: cash ? 'Payment marked complete' : 'Booking marked served',
        body: `${booking.serviceName} · ${formatINR(booking.total)}`,
      },
    ])

    // Customer SMS: service complete.
    const customer = await User.findById(booking.customer).catch(() => null)
    await sendFlowSms({
      flowId: env.msg91.completedFlowId,
      phone: customer?.phone,
      vars: { REF: booking.ref },
      label: 'completed',
    })

    res.json({ booking: booking.toPublic() })
  }),
)

/* ---- Customer: cancel a booking (refund → wallet instant / UPI 5-7 working days) ---- */

const cancelSchema = z.object({ method: z.enum(['wallet', 'upi']) })

router.post(
  '/:id/cancel',
  requireAuth,
  requireRole('customer'),
  validate(cancelSchema),
  asyncHandler(async (req, res) => {
    const booking = await Booking.findById(req.params.id).catch(() => null)
    if (!booking) throw new ApiError(404, 'Booking not found.')
    if (booking.customer.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'That is not your booking.')
    }
    if (booking.status === 'cancelled') {
      throw new ApiError(400, 'This booking is already cancelled.')
    }

    const refund = refundFor(booking, req.body.method)
    // UPI/bank refund → issue it to the original source via Razorpay now.
    await issueSourceRefund(booking, refund, 'customer_cancel')
    booking.status = 'cancelled'
    booking.refund = refund
    booking.cancelledAt = new Date()
    await booking.save()

    // A wallet refund lands immediately; UPI is marked processing and settles offline.
    let walletBalance = req.user.walletBalance
    if (refund.status === 'completed' && refund.method === 'wallet' && refund.amount > 0) {
      walletBalance += refund.amount
      await User.updateOne({ _id: req.user._id }, { walletBalance })
      await WalletTxn.create({
        user: req.user._id,
        type: 'credit',
        amount: refund.amount,
        note: `Refund for ${booking.serviceName}`,
        bookingRef: booking.ref,
        balanceAfter: walletBalance,
      })
    }

    // Cash-booking abuse guard: a cash cancel counts as a strike; 3 → blocked.
    let cashBlocked = req.user.cashBlocked
    if (booking.paymentMode === 'offline') {
      const count = (req.user.cashCancelCount || 0) + 1
      cashBlocked = count >= 3
      await User.updateOne({ _id: req.user._id }, { cashCancelCount: count, cashBlocked })
    }

    const salon = await Salon.findById(booking.salon).catch(() => null)
    const feeLine = refund.fee > 0 ? ` (${refund.feePct}% fee ${formatINR(refund.fee)})` : ''
    const refundLine =
      refund.status === 'completed'
        ? `${formatINR(refund.amount)} credited to your wallet${feeLine}`
        : refund.status === 'processing'
          ? `${formatINR(refund.amount)} refunded to UPI/bank in 5–7 working days${feeLine}`
          : 'No payment was taken, so nothing to refund'
    await notify([
      {
        audience: `user:${req.user._id.toString()}`,
        tone: 'warn',
        title: 'Booking cancelled',
        body: `${booking.serviceName} · ${refundLine}`,
      },
      ...(salon
        ? [
            {
              audience: `owner:${salon.owner.toString()}`,
              tone: 'warn',
              title: 'Booking cancelled',
              body: `${booking.serviceName} · ${booking.dateLabel}, ${booking.slot}`,
            },
          ]
        : []),
    ])

    // Owner SMS: a customer cancelled.
    const ownerPhones = await resolveOwnerPhones(salon)
    await Promise.allSettled(
      ownerPhones.map((phone) =>
        sendFlowSms({
          flowId: env.msg91.ownerCancelAlertFlowId,
          phone,
          vars: {
            REF: booking.ref,
            CUSTOMER_NAME: req.user.name,
            SERVICE: booking.serviceName,
            WHEN: bookingWhen(booking),
          },
          label: 'owner-cancelled',
        }),
      ),
    )

    res.json({ booking: booking.toPublic({ includeOtp: true }), walletBalance, cashBlocked })
  }),
)

/* ---- Owner: mark a customer no-show (didn't turn up after 15 min) ---- */

// Preset no-show reasons — the owner picks one, no free typing.
export const NO_SHOW_REASONS = [
  'Customer did not arrive',
  'Customer arrived too late',
  'Customer was unreachable',
]

const NO_SHOW_GRACE_MS = 15 * 60 * 1000
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000

/**
 * Epoch ms of a booking's slot start, read as India time (the app is IST-only).
 * date "yyyy-mm-dd" + slot (12h or 24h). TZ-safe on any server (Vercel = UTC).
 */
function slotStartMsIST(date, slot) {
  const [y, mo, d] = (date || '').split('-').map(Number)
  const m = /^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i.exec((slot || '').trim())
  if (!y || !m) return NaN
  let h = Number(m[1])
  const min = Number(m[2])
  if (m[3]) {
    h = h % 12
    if (/PM/i.test(m[3])) h += 12
  }
  return Date.UTC(y, mo - 1, d, h, min) - IST_OFFSET_MS
}

const noShowSchema = z.object({ reason: z.string().trim().max(80).optional() })

router.post(
  '/:id/no-show',
  requireAuth,
  requireRole('owner'),
  validate(noShowSchema),
  asyncHandler(async (req, res) => {
    const booking = await Booking.findById(req.params.id).catch(() => null)
    if (!booking) throw new ApiError(404, 'Booking not found.')

    const owns = await Salon.exists({ _id: booking.salon, owner: req.user._id })
    if (!owns) throw new ApiError(403, 'That booking is not for your salon.')
    if (booking.status !== 'confirmed') {
      throw new ApiError(400, 'Only a confirmed booking can be marked no-show.')
    }

    // A no-show can only be recorded once the customer is 15 minutes late.
    const start = slotStartMsIST(booking.date, booking.slot)
    if (Number.isFinite(start) && Date.now() < start + NO_SHOW_GRACE_MS) {
      throw new ApiError(
        400,
        'You can mark a no-show only 15 minutes after the booking time.',
      )
    }

    // Store the chosen reason if it's one of the presets; ignore anything else.
    const reason = NO_SHOW_REASONS.includes(req.body.reason) ? req.body.reason : null

    // Online: 15% penalty, 85% refundable — but the customer isn't here to pick
    // Wallet vs UPI/bank, so the refund starts `pending`; they choose the
    // destination later via /no-show-refund. Cash: nothing was paid.
    const refund = noShowRefund(booking)
    booking.status = 'cancelled'
    booking.noShow = true
    booking.noShowReason = reason
    booking.refund = refund
    booking.cancelledAt = new Date()
    await booking.save()

    // A cash no-show is a strike toward the cash block.
    if (booking.paymentMode === 'offline') {
      const customer = await User.findById(booking.customer).catch(() => null)
      if (customer) {
        const n = (customer.cashCancelCount || 0) + 1
        await User.updateOne({ _id: customer._id }, { cashCancelCount: n, cashBlocked: n >= 3 })
      }
    }

    await notify([
      {
        audience: `user:${booking.customer.toString()}`,
        tone: 'warn',
        title: 'Marked as no-show',
        body:
          refund.status === 'pending' && refund.amount > 0
            ? `${booking.serviceName}: 15% penalty applied. Choose where to receive your ${formatINR(refund.amount)} refund in My Bookings.`
            : `${booking.serviceName} was marked no-show.`,
      },
      {
        audience: `owner:${req.user._id.toString()}`,
        tone: 'info',
        title: 'No-show recorded',
        body: `${booking.serviceName} · ${booking.dateLabel}, ${booking.slot}${
          reason ? ` · ${reason}` : ''
        }`,
      },
    ])

    res.json({ booking: booking.toPublic() })
  }),
)

/* ---- Customer: choose where a pending no-show refund is paid ---- */

const noShowRefundSchema = z.object({ method: z.enum(['wallet', 'upi']) })

router.post(
  '/:id/no-show-refund',
  requireAuth,
  requireRole('customer'),
  validate(noShowRefundSchema),
  asyncHandler(async (req, res) => {
    const booking = await Booking.findById(req.params.id).catch(() => null)
    if (!booking) throw new ApiError(404, 'Booking not found.')
    if (booking.customer.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'That is not your booking.')
    }
    if (!booking.noShow || booking.refund?.status !== 'pending') {
      throw new ApiError(400, 'No refund is pending for this booking.')
    }

    const refund = noShowRefund(booking, req.body.method)
    // UPI/bank refund → issue it to the original source via Razorpay now.
    await issueSourceRefund(booking, refund, 'no_show')
    booking.refund = refund
    await booking.save()

    // Wallet is instant; UPI/bank is marked processing and settled offline.
    let walletBalance = req.user.walletBalance
    if (refund.status === 'completed' && refund.method === 'wallet' && refund.amount > 0) {
      walletBalance = (req.user.walletBalance || 0) + refund.amount
      await User.updateOne({ _id: req.user._id }, { walletBalance })
      await WalletTxn.create({
        user: req.user._id,
        type: 'credit',
        amount: refund.amount,
        note: `No-show refund (15% penalty) for ${booking.serviceName}`,
        bookingRef: booking.ref,
        balanceAfter: walletBalance,
      })
    }

    res.json({ booking: booking.toPublic(), walletBalance })
  }),
)

/* ---- Owner: cancel a booking (salon's fault → full refund to customer) ---- */

// Preset owner-cancel reasons — the owner taps one, no free typing.
export const OWNER_CANCEL_REASONS = [
  'Salon closed unexpectedly',
  'Staff unavailable',
  'Fully booked for this slot',
  'Unable to provide the service',
]

const ownerCancelSchema = z.object({ reason: z.string().trim().max(80).optional() })

router.post(
  '/:id/cancel-by-owner',
  requireAuth,
  requireRole('owner'),
  validate(ownerCancelSchema),
  asyncHandler(async (req, res) => {
    const booking = await Booking.findById(req.params.id).catch(() => null)
    if (!booking) throw new ApiError(404, 'Booking not found.')

    const owns = await Salon.exists({ _id: booking.salon, owner: req.user._id })
    if (!owns) throw new ApiError(403, 'That booking is not for your salon.')
    if (booking.status !== 'confirmed') {
      throw new ApiError(400, 'Only a confirmed booking can be cancelled.')
    }

    // Store the chosen reason only if it's one of the presets.
    const reason = OWNER_CANCEL_REASONS.includes(req.body.reason) ? req.body.reason : null

    // Full refund, no penalty — credited straight to the customer's wallet.
    const refund = ownerCancelRefund(booking)
    booking.status = 'cancelled'
    booking.cancelledBy = 'owner'
    booking.cancelReason = reason
    booking.refund = refund
    booking.cancelledAt = new Date()
    await booking.save()

    const customer = await User.findById(booking.customer).catch(() => null)
    if (refund.status === 'completed' && refund.method === 'wallet' && refund.amount > 0 && customer) {
      const walletBalance = (customer.walletBalance || 0) + refund.amount
      await User.updateOne({ _id: customer._id }, { walletBalance })
      await WalletTxn.create({
        user: customer._id,
        type: 'credit',
        amount: refund.amount,
        note: `Full refund — salon cancelled ${booking.serviceName}`,
        bookingRef: booking.ref,
        balanceAfter: walletBalance,
      })
    }

    // Accountability: count owner cancellations so abuse is visible.
    await User.updateOne({ _id: req.user._id }, { $inc: { ownerCancelCount: 1 } })

    const refundLine =
      refund.status === 'completed'
        ? `Full refund of ${formatINR(refund.amount)} credited to your wallet.`
        : 'No payment was taken, so nothing to refund.'
    const reasonLine = reason ? ` Reason: ${reason}.` : ''
    await notify([
      {
        audience: `user:${booking.customer.toString()}`,
        tone: 'warn',
        title: 'Booking cancelled by the salon',
        body: `${booking.serviceName} · ${booking.dateLabel}, ${booking.slot}.${reasonLine} ${refundLine}`,
      },
      {
        audience: `owner:${req.user._id.toString()}`,
        tone: 'info',
        title: 'Booking cancelled',
        body: `${booking.serviceName} · ${booking.dateLabel}, ${booking.slot}${reason ? ` · ${reason}` : ''}`,
      },
    ])

    // Customer SMS: the salon cancelled, full refund on the way.
    await sendFlowSms({
      flowId: env.msg91.salonCancelFlowId,
      phone: customer?.phone,
      vars: {
        CUSTOMER_NAME: customer?.name || 'Customer',
        REF: booking.ref,
        SERVICE: booking.serviceName,
        WHEN: bookingWhen(booking),
        REASON: reason || 'Salon unavailable',
      },
      label: 'salon-cancel',
    })

    res.json({ booking: booking.toPublic() })
  }),
)

/* ---- Customer: own bookings ---- */

router.get(
  '/mine',
  requireAuth,
  requireRole('customer'),
  asyncHandler(async (req, res) => {
    const bookings = await Booking.find({ customer: req.user._id }).sort({ createdAt: -1 })
    res.json({ bookings: bookings.map((b) => b.toPublic({ includeOtp: true })) })
  }),
)

/* ---- Owner: bookings across their salons ---- */

router.get(
  '/owner',
  requireAuth,
  requireRole('owner'),
  asyncHandler(async (req, res) => {
    const salonIds = await Salon.find({ owner: req.user._id }).distinct('_id')
    const bookings = await Booking.find({ salon: { $in: salonIds } })
      .populate('customer', 'name phone')
      .sort({ createdAt: -1 })
    res.json({ bookings: bookings.map((b) => b.toPublic({ includeCustomer: true })) })
  }),
)

/* ---- Founder: every booking ---- */

router.get(
  '/all',
  requireAuth,
  requireRole('founder'),
  asyncHandler(async (req, res) => {
    const bookings = await Booking.find().sort({ createdAt: -1 })
    res.json({ bookings: bookings.map((b) => b.toPublic()) })
  }),
)

export default router
