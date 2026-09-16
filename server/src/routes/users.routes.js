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

const blockSchema = z.object({ phone: phoneField })

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

/* ---- Founder: platform-wide block/unblock of any account by number ---- */

/** Founder: list every platform-blocked account. */
router.get(
  '/blocked',
  requireAuth,
  requireRole('founder'),
  asyncHandler(async (_req, res) => {
    const users = await User.find({ blocked: true }).sort({ updatedAt: -1 })
    res.json({ users: users.map((u) => u.toPublic()) })
  }),
)

/** Founder: block (or unblock) a customer/owner platform-wide by phone. */
async function setBlocked(req, res, blocked) {
  const target = await User.findOne({ phone: req.body.phone })
  if (!target) throw new ApiError(404, 'No account is registered with that number.')
  if (target.role === 'founder') throw new ApiError(400, 'You can’t block a founder account.')
  target.blocked = blocked
  await target.save()
  res.json({ user: target.toPublic() })
}

router.post(
  '/block',
  requireAuth,
  requireRole('founder'),
  validate(blockSchema),
  asyncHandler((req, res) => setBlocked(req, res, true)),
)

router.post(
  '/unblock',
  requireAuth,
  requireRole('founder'),
  validate(blockSchema),
  asyncHandler((req, res) => setBlocked(req, res, false)),
)

/* ---- Owner: block/unblock a customer from their own salons ---- */

/** Owner: the numbers they've blocked from booking at their salons. */
router.get(
  '/owner-blocked',
  requireAuth,
  requireRole('owner'),
  asyncHandler(async (req, res) => {
    res.json({ blockedCustomers: req.user.blockedCustomers ?? [] })
  }),
)

router.post(
  '/owner-block',
  requireAuth,
  requireRole('owner'),
  validate(blockSchema),
  asyncHandler(async (req, res) => {
    const { phone } = req.body
    if (phone === req.user.phone) throw new ApiError(400, 'That’s your own number.')
    const target = await User.findOne({ phone })
    if (target && target.role !== 'customer') {
      throw new ApiError(400, 'You can only block customer numbers.')
    }
    if (!req.user.blockedCustomers.includes(phone)) {
      req.user.blockedCustomers.push(phone)
      await req.user.save()
    }
    res.json({ blockedCustomers: req.user.blockedCustomers })
  }),
)

router.post(
  '/owner-unblock',
  requireAuth,
  requireRole('owner'),
  validate(blockSchema),
  asyncHandler(async (req, res) => {
    req.user.blockedCustomers = (req.user.blockedCustomers ?? []).filter(
      (p) => p !== req.body.phone,
    )
    await req.user.save()
    res.json({ blockedCustomers: req.user.blockedCustomers })
  }),
)

export default router
