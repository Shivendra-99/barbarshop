import { Router } from 'express'
import { z } from 'zod'
import { Booking } from '../models/Booking.js'
import { Salon } from '../models/Salon.js'
import { Service } from '../models/Service.js'
import { User } from '../models/User.js'
import { WalletTxn } from '../models/WalletTxn.js'
import { quote, refundFor } from '../lib/pricing.js'
import { validate } from '../middleware/validate.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { asyncHandler, ApiError } from '../middleware/error.js'
import { notify } from '../lib/notify.js'
import { formatINR } from '../lib/money.js'

const router = Router()

const createSchema = z.object({
  salonId: z.string().min(1),
  // Accepts a Mongo id or a service code (e.g. "m-haircut") — see resolution below.
  serviceId: z.string().min(1),
  staffName: z.string().trim().max(60).nullish(),
  mode: z.enum(['salon', 'home']),
  // null/omitted for at-salon; required (checked below) for home service.
  address: z.string().trim().min(6).max(200).nullish(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date.'),
  dateLabel: z.string().optional(),
  slot: z.string().min(1),
  paymentMode: z.enum(['online', 'offline']),
})

const isObjectId = (v) => /^[a-f0-9]{24}$/i.test(v)

const makeRef = () => `SS${Math.floor(100000 + Math.random() * 899999)}`

/* ---- Customer: create a booking ---- */

router.post(
  '/',
  requireAuth,
  requireRole('customer'),
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const body = req.body

    const salon = await Salon.findById(body.salonId).catch(() => null)
    if (!salon || salon.status !== 'approved') {
      throw new ApiError(404, 'Salon not available.')
    }

    if (!isObjectId(body.serviceId)) throw new ApiError(400, 'Invalid service.')
    const service = await Service.findById(body.serviceId).catch(() => null)
    if (!service) throw new ApiError(404, 'Service not found.')
    // The service must belong to the salon being booked.
    if (service.salon.toString() !== salon._id.toString()) {
      throw new ApiError(400, 'That service is not offered by this salon.')
    }

    if (!salon.serviceModes.includes(body.mode)) {
      throw new ApiError(400, `This salon does not offer ${body.mode} service.`)
    }
    if (body.mode === 'home' && !body.address) {
      throw new ApiError(400, 'A home-service booking needs an address.')
    }

    // First booking = the customer has never booked at all. Cancelled bookings
    // still count, so the discount can't be farmed by booking and cancelling.
    const priorCount = await Booking.countDocuments({ customer: req.user._id })
    const isFirstBooking = priorCount === 0

    const homeServiceFee = body.mode === 'home' ? salon.homeServiceFee : 0
    const priced = quote({
      amount: service.amount,
      paymentMode: body.paymentMode,
      isFirstBooking,
      homeServiceFee,
    })

    const booking = await Booking.create({
      ref: makeRef(),
      customer: req.user._id,
      salon: salon._id,
      service: service._id,
      salonName: salon.name,
      serviceName: service.name,
      staffName: body.staffName ?? null,
      mode: body.mode,
      modeLabel: body.mode === 'home' ? 'Home service' : 'At salon',
      address: body.mode === 'home' ? body.address : null,
      date: body.date,
      dateLabel: body.dateLabel ?? body.date,
      slot: body.slot,
      paymentMode: body.paymentMode,
      homeServiceFee,
      ...priced,
      status: 'confirmed',
    })

    // One booking event → three inboxes (customer, owner, founder).
    await notify([
      {
        audience: `user:${req.user._id.toString()}`,
        tone: 'success',
        title: 'Booking confirmed',
        body: `${service.name} at ${salon.name} · ${booking.dateLabel}, ${booking.slot}`,
      },
      {
        audience: `owner:${salon.owner.toString()}`,
        tone: 'info',
        title: 'New booking received',
        body: `${service.name} · ${booking.dateLabel}, ${booking.slot} · ${booking.modeLabel}`,
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

    res.status(201).json({ booking: booking.toPublic() })
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

    booking.date = req.body.date
    booking.dateLabel = req.body.dateLabel ?? req.body.date
    booking.slot = req.body.slot
    await booking.save()

    const salon = await Salon.findById(booking.salon).catch(() => null)
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

    res.json({ booking: booking.toPublic() })
  }),
)

/* ---- Customer: cancel a booking (refund → wallet instant / UPI 2-3 days) ---- */

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

    const salon = await Salon.findById(booking.salon).catch(() => null)
    const refundLine =
      refund.status === 'completed'
        ? `${formatINR(refund.amount)} credited to your wallet`
        : refund.status === 'processing'
          ? `${formatINR(refund.amount)} refunded to UPI in 2–3 days`
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

    res.json({ booking: booking.toPublic(), walletBalance })
  }),
)

/* ---- Customer: own bookings ---- */

router.get(
  '/mine',
  requireAuth,
  requireRole('customer'),
  asyncHandler(async (req, res) => {
    const bookings = await Booking.find({ customer: req.user._id }).sort({ createdAt: -1 })
    res.json({ bookings: bookings.map((b) => b.toPublic()) })
  }),
)

/* ---- Owner: bookings across their salons ---- */

router.get(
  '/owner',
  requireAuth,
  requireRole('owner'),
  asyncHandler(async (req, res) => {
    const salonIds = await Salon.find({ owner: req.user._id }).distinct('_id')
    const bookings = await Booking.find({ salon: { $in: salonIds } }).sort({ createdAt: -1 })
    res.json({ bookings: bookings.map((b) => b.toPublic()) })
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
