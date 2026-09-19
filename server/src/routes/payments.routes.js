import { Router } from 'express'
import { z } from 'zod'
import { env, razorpayEnabled } from '../config/env.js'
import { PaymentIntent } from '../models/PaymentIntent.js'
import { User } from '../models/User.js'
import { Booking } from '../models/Booking.js'
import { createOrder, verifySignature, verifyWebhookSignature } from '../lib/razorpay.js'
import {
  createSchema,
  priceBookingDraft,
  createBookingRecord,
  assertSlotAvailable,
} from './bookings.routes.js'
import { validate } from '../middleware/validate.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { asyncHandler, ApiError } from '../middleware/error.js'

const router = Router()

/**
 * Turn a paid PaymentIntent into a Booking, exactly once. The atomic
 * created→paid flip is the lock: whichever of /verify and the webhook runs
 * first wins the claim and creates the booking; the other gets null back and
 * returns the booking that already exists. If booking creation itself fails
 * (e.g. the slot filled up), the claim is released so it can be retried.
 */
async function materializeBooking(intent, paymentId) {
  const claimed = await PaymentIntent.findOneAndUpdate(
    { _id: intent._id, status: 'created' },
    { status: 'paid' },
    { new: true },
  )
  if (!claimed) {
    return Booking.findOne({ 'razorpay.orderId': intent.orderId }).catch(() => null)
  }
  const user = await User.findById(intent.user)
  if (!user) throw new ApiError(404, 'User not found for this payment.')
  let booking
  try {
    booking = await createBookingRecord(user, intent.draft, {
      paid: true,
      orderId: intent.orderId,
      paymentId,
    })
  } catch (err) {
    claimed.status = 'created' // release the claim so a retry can succeed
    await claimed.save().catch(() => {})
    throw err
  }
  claimed.bookingRef = booking.ref
  await claimed.save()
  return booking
}

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
    const { salon, primary, priced } = await priceBookingDraft(req.user, draft)

    if (!priced.total || priced.total <= 0) {
      throw new ApiError(400, 'Nothing to pay for this booking.')
    }

    // Don't take payment for a slot that's already full.
    await assertSlotAvailable(salon, draft.date, draft.slot)

    const order = await createOrder({
      amount: priced.total,
      currency: 'INR',
      receipt: `bk_${Date.now()}`,
      notes: { salon: salon.name, service: primary.name, user: req.user._id.toString() },
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
      description: `${primary.name} · ${salon.name}`,
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

    // Idempotent: if the webhook already materialised this, we get that booking back.
    const booking = await materializeBooking(intent, paymentId)
    if (!booking) throw new ApiError(409, 'Payment received but the booking could not be created.')

    res.status(201).json({ booking: booking.toPublic({ includeOtp: true }) })
  }),
)

/* ---- Razorpay webhook: catch payments the browser never confirmed ---- */

// Safety net for when the customer pays but closes the tab before /verify runs.
// Razorpay POSTs payment.captured here; we verify the signature over the raw
// body (see express.raw in app.js) and materialise the booking from the intent.
router.post(
  '/webhook',
  asyncHandler(async (req, res) => {
    const signature = req.headers['x-razorpay-signature']
    const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from('')
    if (!verifyWebhookSignature(raw, signature)) {
      throw new ApiError(400, 'Invalid webhook signature.')
    }

    const event = JSON.parse(raw.toString('utf8') || '{}')
    if (event.event === 'payment.captured') {
      const entity = event.payload?.payment?.entity || {}
      const orderId = entity.order_id
      const paymentId = entity.id
      if (orderId && paymentId) {
        const intent = await PaymentIntent.findOne({ orderId }).catch(() => null)
        // No intent = not our order, or it already TTL-expired unpaid → just ack.
        if (intent) await materializeBooking(intent, paymentId)
      }
    }

    // Ack everything else too, so Razorpay stops retrying handled events.
    res.json({ ok: true })
  }),
)

export default router
