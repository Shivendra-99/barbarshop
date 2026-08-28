import { Router } from 'express'
import { z } from 'zod'
import { Salon } from '../models/Salon.js'
import { Service } from '../models/Service.js'
import { User } from '../models/User.js'
import { validate } from '../middleware/validate.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { asyncHandler, ApiError } from '../middleware/error.js'
import { notify } from '../lib/notify.js'
import { geocode } from '../lib/geo/mappls.js'

const router = Router()

const serviceItem = z.object({
  name: z.string().trim().min(2).max(80),
  amount: z.number().int().min(0).max(100000),
  mins: z.number().int().min(5).max(600),
  desc: z.string().trim().max(300).optional().default(''),
})

const createSchema = z.object({
  name: z.string().trim().min(3).max(80),
  category: z.enum(['mens', 'unisex', 'parlour']),
  city: z.string().trim().min(2),
  area: z.string().trim().min(2),
  address: z.string().trim().min(8),
  serviceModes: z.array(z.enum(['salon', 'home'])).min(1),
  homeServiceFee: z.number().int().min(0).max(5000).default(0),
  opens: z.string().default('10:00'),
  closes: z.string().default('20:00'),
  // Mappls eLoc for the address, when picked from autosuggest.
  addressELoc: z.string().trim().max(40).optional(),
  // Founder only — the owner this salon belongs to.
  ownerId: z.string().trim().optional(),
  // The owner's initial menu, reviewed together with the salon.
  services: z.array(serviceItem).min(1, 'Add at least one service.'),
})

const statusSchema = z.object({ status: z.enum(['approved', 'rejected']) })

/**
 * Attaches each salon's live starting price (the cheapest of its own services)
 * as `from`. One grouped query for the whole set — no N+1.
 */
async function withFrom(salons) {
  const ids = salons.map((s) => s._id)
  const rows = await Service.aggregate([
    { $match: { salon: { $in: ids } } },
    { $group: { _id: '$salon', from: { $min: '$amount' } } },
  ])
  const minBy = new Map(rows.map((r) => [r._id.toString(), r.from]))
  return salons.map((s) => ({ ...s.toPublic(), from: minBy.get(s._id.toString()) ?? null }))
}

/**
 * Attaches each salon's owner name — for the founder's views, where salons can
 * belong to any owner the founder has added (not just the seed list). One query
 * for the whole set.
 */
async function withOwnerNames(salons) {
  const ids = [...new Set(salons.map((s) => s.ownerId).filter(Boolean))]
  const owners = await User.find({ _id: { $in: ids } }).select('name')
  const nameBy = new Map(owners.map((o) => [o._id.toString(), o.name]))
  return salons.map((s) => ({ ...s, ownerName: nameBy.get(s.ownerId) ?? null }))
}

/* ---- Founder: full list & pending queue (declared before ":id") ---- */

router.get(
  '/all',
  requireAuth,
  requireRole('founder'),
  asyncHandler(async (req, res) => {
    const salons = await Salon.find().sort({ createdAt: -1 })
    res.json({ salons: await withOwnerNames(await withFrom(salons)) })
  }),
)

router.get(
  '/pending',
  requireAuth,
  requireRole('founder'),
  asyncHandler(async (req, res) => {
    const salons = await Salon.find({ status: 'pending' }).sort({ createdAt: -1 })
    res.json({ salons: await withOwnerNames(await withFrom(salons)) })
  }),
)

/* ---- Owner: their own salons ---- */

router.get(
  '/mine',
  requireAuth,
  requireRole('owner'),
  asyncHandler(async (req, res) => {
    const salons = await Salon.find({ owner: req.user._id }).sort({ createdAt: -1 })
    res.json({ salons: await withFrom(salons) })
  }),
)

/* ---- Public: approved salons, filterable by city/category ---- */

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filter = { status: 'approved' }
    if (req.query.city) filter.city = req.query.city
    if (req.query.category) filter.category = req.query.category
    const salons = await Salon.find(filter).sort({ rating: -1 })
    res.json({ salons: await withFrom(salons) })
  }),
)

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const salon = await Salon.findById(req.params.id).catch(() => null)
    if (!salon || salon.status !== 'approved') {
      throw new ApiError(404, 'Salon not found.')
    }
    const [withPrice] = await withFrom([salon])
    res.json({ salon: withPrice })
  }),
)

/* ---- Add a new salon ----
   Owner: submits their own salon, which enters the approval queue.
   Founder: adds a salon on behalf of an owner (ownerId), auto-approved. */

router.post(
  '/',
  requireAuth,
  requireRole('owner', 'founder'),
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const { services, addressELoc, ownerId, ...salonBody } = req.body

    // Resolve who owns the salon and whether it's auto-approved.
    let ownerObjectId = req.user._id
    let status = 'pending'
    if (req.user.role === 'founder') {
      if (!ownerId) throw new ApiError(400, 'Choose which owner this salon belongs to.')
      const owner = await User.findById(ownerId).catch(() => null)
      if (!owner || owner.role !== 'owner') throw new ApiError(400, 'Selected owner not found.')
      ownerObjectId = owner._id
      status = 'approved' // the founder is the approver
    }

    // Resolve the address to a geo reference: eLoc from the pick, lat/lng from
    // the geocoder (null if unavailable — never blocks salon submission).
    const coords = await geocode({ eLoc: addressELoc, address: salonBody.address })
    const location = { eLoc: addressELoc ?? null, lat: coords?.lat ?? null, lng: coords?.lng ?? null }

    const salon = await Salon.create({
      ...salonBody,
      location,
      owner: ownerObjectId,
      status,
      badge: 'New',
    })

    // Create the owner's initial menu alongside the salon.
    await Service.insertMany(
      services.map((s) => ({
        ...s,
        salon: salon._id,
        owner: ownerObjectId,
        category: salon.category,
      })),
    )

    if (req.user.role === 'founder') {
      await notify([
        {
          audience: `owner:${ownerObjectId.toString()}`,
          tone: 'success',
          title: 'A salon was added to your account',
          body: `${salon.name} · ${salon.area} is live and taking bookings.`,
        },
      ])
    } else {
      await notify([
        {
          audience: `owner:${ownerObjectId.toString()}`,
          tone: 'info',
          title: 'Salon submitted for review',
          body: `${salon.name} · ${salon.area} — awaiting approval`,
        },
        {
          audience: 'founder',
          tone: 'warn',
          title: 'New salon approval request',
          body: `${salon.name} · ${salon.area}, ${salon.city}`,
        },
      ])
    }

    res.status(201).json({ salon: salon.toPublic() })
  }),
)

/* ---- Founder: approve / decline ---- */

router.patch(
  '/:id/status',
  requireAuth,
  requireRole('founder'),
  validate(statusSchema),
  asyncHandler(async (req, res) => {
    const salon = await Salon.findById(req.params.id).catch(() => null)
    if (!salon) throw new ApiError(404, 'Salon not found.')
    salon.status = req.body.status
    await salon.save()

    const approved = salon.status === 'approved'
    await notify([
      {
        audience: `owner:${salon.owner.toString()}`,
        tone: approved ? 'success' : 'warn',
        title: approved ? 'Salon approved' : 'Salon declined',
        body: approved
          ? `${salon.name} is now live and taking bookings.`
          : `${salon.name} was not approved. Contact support to revise it.`,
      },
    ])

    res.json({ salon: salon.toPublic() })
  }),
)

export default router
