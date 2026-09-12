import { Router } from 'express'
import { z } from 'zod'
import { env, razorpayEnabled } from '../config/env.js'
import { PaymentIntent } from '../models/PaymentIntent.js'
import { createOrder, verifySignature } from '../lib/razorpay.js'
import { createSchema, priceBookingDraft, createBookingRecord } from './bookings.routes.js'
import { validate } from '../middleware/validate.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { asyncHandler, ApiError } from '../middleware/error.js'

const router = Router()

/* ---- Is online payment available? (keyId is public, safe to expose) ---- */

router.get(
  '/config',
  asyncHandler(async (_req, res) => {
    res.json({ enabled: razorpayEnabled(), keyId: razorpayEnabled() ? env.razorpay.keyId : null })
  }),
)

/* ---- Create a Razorpay order for an online booking ---- */

router.post(
  '/order',
  requireAuth,
  requireRole('customer'),
  validate(createSchema),
  asyncHandler(async (req, res) => {
    if (!razorpayEnabled()) throw new ApiError(503, 'Online payments are not available.')

    // Force online: this route only exists to charge upfront.
    const draft = { ...req.body, paymentMode: 'online' }
    const { salon, service, priced } = await priceBookingDraft(req.user, draft)

    if (!priced.total || priced.total <= 0) {
      throw new ApiError(400, 'Nothing to pay for this booking.')
    }

    const order = await createOrder({
      amount: priced.total,
      currency: 'INR',
      receipt: `bk_${Date.now()}`,
      notes: { salon: salon.name, service: service.name, user: req.user._id.toString() },
    })

    await PaymentIntent.create({
      orderId: order.id,
      user: req.user._id,
      draft,
      amount: order.amount,
      currency: order.currency,
      status: 'created',
    })

    res.status(201).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: env.razorpay.keyId,
      name: 'SalonSaathi',
      description: `${service.name} · ${salon.name}`,
      prefill: { name: req.user.name || '', contact: req.user.phone || '' },
    })
  }),
)

/* ---- Verify the Checkout callback and create the paid booking ---- */

const verifySchema = z.object({
  orderId: z.string().min(1),
  paymentId: z.string().min(1),
  signature: z.string().min(1),
})

router.post(
  '/verify',
  requireAuth,
  requireRole('customer'),
  validate(verifySchema),
  asyncHandler(async (req, res) => {
    const { orderId, paymentId, signature } = req.body

    if (!verifySignature({ orderId, paymentId, signature })) {
      throw new ApiError(400, 'Payment could not be verified.')
    }

    const intent = await PaymentIntent.findOne({ orderId }).catch(() => null)
    if (!intent) throw new ApiError(404, 'Payment session expired. Please try again.')
    if (intent.user.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'That payment is not yours.')
    }

    // Already turned into a booking? Return it rather than double-charging state.
    if (intent.status === 'paid') {
      const existing = await import('../models/Booking.js').then(({ Booking }) =>
        Booking.findOne({ 'razorpay.orderId': orderId }).catch(() => null),
      )
      if (existing) return res.json({ booking: existing.toPublic() })
    }

    const booking = await createBookingRecord(req.user, intent.draft, {
      paid: true,
      orderId,
      paymentId,
    })

    intent.status = 'paid'
    intent.bookingRef = booking.ref
    await intent.save()

    res.status(201).json({ booking: booking.toPublic() })
  }),
)

export default router
