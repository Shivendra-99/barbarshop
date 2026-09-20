import { Router } from 'express'
import { z } from 'zod'
import { Coupon } from '../models/Coupon.js'
import { Salon } from '../models/Salon.js'
import { priceBookingDraft } from './bookings.routes.js'
import { validate } from '../middleware/validate.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { asyncHandler, ApiError } from '../middleware/error.js'

const router = Router()

/* ---- Customer: preview a coupon against a booking draft ---- */

const validateSchema = z
  .object({
    couponCode: z.string().trim().min(1).max(24),
    salonId: z.string().min(1),
    serviceId: z.string().min(1).optional(),
    serviceIds: z.array(z.string().min(1)).min(1).max(10).optional(),
    mode: z.enum(['salon', 'home']),
  })
  .refine((b) => b.serviceId || (b.serviceIds && b.serviceIds.length), {
    message: 'Choose at least one service.',
    path: ['serviceIds'],
  })

router.post(
  '/validate',
  requireAuth,
  requireRole('customer'),
  validate(validateSchema),
  asyncHandler(async (req, res) => {
    // Coupons are online-only, so price as online. priceBookingDraft throws with
    // a clear message if the code is invalid; otherwise quote() decides best-of.
    const { priced, coupon } = await priceBookingDraft(req.user, {
      ...req.body,
      paymentMode: 'online',
    })
    res.json({
      priced,
      applied: priced.couponDiscount > 0,
      coupon: coupon
        ? {
            code: coupon.code,
            type: coupon.type,
            value: coupon.value,
            maxDiscount: coupon.maxDiscount,
            minOrder: coupon.minOrder,
          }
        : null,
    })
  }),
)

/* ---- Owner / founder: manage coupons ---- */

const createSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3)
      .max(24)
      .regex(/^[A-Za-z0-9]+$/, 'Use letters and numbers only.'),
    description: z.string().trim().max(120).optional(),
    type: z.enum(['percent', 'flat']),
    value: z.number().int().min(1),
    maxDiscount: z.number().int().min(0).optional(),
    minOrder: z.number().int().min(0).optional(),
    usageLimit: z.number().int().min(0).optional(),
    perUserLimit: z.number().int().min(0).optional(),
    validFrom: z.string().trim().optional().nullable(),
    validTo: z.string().trim().optional().nullable(),
    salonId: z.string().trim().optional().nullable(), // founder only
  })
  .refine((c) => c.type !== 'percent' || c.value <= 90, {
    message: 'A percentage coupon must be 90% or less.',
    path: ['value'],
  })

/** The salon a coupon belongs to: an owner is locked to their own; a founder may
 *  target a salon (salonId) or leave it platform-wide (null). */
async function resolveScope(user, salonId) {
  if (user.role === 'owner') {
    const own = await Salon.findOne({ owner: user._id })
    if (!own) throw new ApiError(400, 'Set up your salon before creating coupons.')
    return own._id
  }
  if (salonId) {
    const s = await Salon.findById(salonId).catch(() => null)
    if (!s) throw new ApiError(404, 'Salon not found.')
    return s._id
  }
  return null // founder platform-wide coupon
}

/** True when this user may edit/delete the given coupon. */
async function ownsCoupon(user, coupon) {
  if (user.role === 'founder') return true
  if (!coupon.salon) return false // platform coupons are founder-only
  const own = await Salon.findOne({ owner: user._id })
  return Boolean(own && coupon.salon.toString() === own._id.toString())
}

router.post(
  '/',
  requireAuth,
  requireRole('owner', 'founder'),
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const b = req.body
    const salon = await resolveScope(req.user, b.salonId)
    const code = b.code.toUpperCase()

    if (await Coupon.findOne({ code })) {
      throw new ApiError(409, 'A coupon with this code already exists.')
    }

    const coupon = await Coupon.create({
      code,
      description: b.description || '',
      type: b.type,
      value: b.value,
      maxDiscount: b.type === 'percent' ? b.maxDiscount || 0 : 0,
      minOrder: b.minOrder || 0,
      salon,
      createdBy: req.user._id,
      usageLimit: b.usageLimit || 0,
      perUserLimit: b.perUserLimit ?? 1,
      validFrom: b.validFrom ? new Date(b.validFrom) : null,
      validTo: b.validTo ? new Date(b.validTo) : null,
    })
    res.status(201).json({ coupon: coupon.toPublic() })
  }),
)

router.get(
  '/',
  requireAuth,
  requireRole('owner', 'founder'),
  asyncHandler(async (req, res) => {
    let filter = {}
    if (req.user.role === 'owner') {
      const own = await Salon.findOne({ owner: req.user._id })
      if (!own) return res.json({ coupons: [] })
      filter = { salon: own._id }
    }
    const coupons = await Coupon.find(filter).sort({ createdAt: -1 })
    return res.json({ coupons: coupons.map((c) => c.toPublic()) })
  }),
)

const updateSchema = z.object({
  active: z.boolean().optional(),
  description: z.string().trim().max(120).optional(),
  usageLimit: z.number().int().min(0).optional(),
  perUserLimit: z.number().int().min(0).optional(),
  validTo: z.string().trim().optional().nullable(),
})

router.patch(
  '/:id',
  requireAuth,
  requireRole('owner', 'founder'),
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    const coupon = await Coupon.findById(req.params.id).catch(() => null)
    if (!coupon) throw new ApiError(404, 'Coupon not found.')
    if (!(await ownsCoupon(req.user, coupon))) throw new ApiError(403, 'That is not your coupon.')

    const b = req.body
    if (b.active !== undefined) coupon.active = b.active
    if (b.description !== undefined) coupon.description = b.description
    if (b.usageLimit !== undefined) coupon.usageLimit = b.usageLimit
    if (b.perUserLimit !== undefined) coupon.perUserLimit = b.perUserLimit
    if (b.validTo !== undefined) coupon.validTo = b.validTo ? new Date(b.validTo) : null
    await coupon.save()
    res.json({ coupon: coupon.toPublic() })
  }),
)

router.delete(
  '/:id',
  requireAuth,
  requireRole('owner', 'founder'),
  asyncHandler(async (req, res) => {
    const coupon = await Coupon.findById(req.params.id).catch(() => null)
    if (!coupon) throw new ApiError(404, 'Coupon not found.')
    if (!(await ownsCoupon(req.user, coupon))) throw new ApiError(403, 'That is not your coupon.')
    await coupon.deleteOne()
    res.json({ ok: true })
  }),
)

export default router
