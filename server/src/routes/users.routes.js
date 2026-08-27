import { Router } from 'express'
import { z } from 'zod'
import { User } from '../models/User.js'
import { Salon } from '../models/Salon.js'
import { validate } from '../middleware/validate.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { asyncHandler, ApiError } from '../middleware/error.js'

const router = Router()

const phoneField = z
  .string()
  .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number.')

const createOwnerSchema = z.object({
  name: z.string().trim().min(1, 'Enter the owner’s name.').max(60),
  phone: phoneField,
})

/** Shape one owner for the founder's table (public fields + salon count). */
function ownerView(user, salonCount = 0) {
  return { ...user.toPublic(), salonCount, createdAt: user.createdAt }
}

/* ---- Founder: list all owners with how many salons each has ---- */
router.get(
  '/owners',
  requireAuth,
  requireRole('founder'),
  asyncHandler(async (_req, res) => {
    const owners = await User.find({ role: 'owner' }).sort({ createdAt: -1 })
    const counts = await Salon.aggregate([{ $group: { _id: '$owner', total: { $sum: 1 } } }])
    const byOwner = new Map(counts.map((c) => [String(c._id), c.total]))
    res.json({ owners: owners.map((o) => ownerView(o, byOwner.get(o.id) ?? 0)) })
  }),
)

/* ---- Founder: add an owner by name + phone ----
   A brand-new number creates an owner account; a number that already signed in
   as a customer is promoted to owner. Existing owners/founder are rejected. */
router.post(
  '/owners',
  requireAuth,
  requireRole('founder'),
  validate(createOwnerSchema),
  asyncHandler(async (req, res) => {
    const { name, phone } = req.body
    const existing = await User.findOne({ phone })

    if (existing) {
      if (existing.role !== 'customer') {
        throw new ApiError(409, `That number is already ${existing.role === 'founder' ? 'the founder' : 'an owner'}.`)
      }
      existing.role = 'owner'
      if (name) existing.name = name
      await existing.save()
      return res.json({ owner: ownerView(existing, 0) })
    }

    const user = await User.create({ name, phone, role: 'owner' })
    return res.status(201).json({ owner: ownerView(user, 0) })
  }),
)

export default router
