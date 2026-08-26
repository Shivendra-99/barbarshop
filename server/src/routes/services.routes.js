import { Router } from 'express'
import { z } from 'zod'
import { Service } from '../models/Service.js'
import { Salon } from '../models/Salon.js'
import { validate } from '../middleware/validate.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { asyncHandler, ApiError } from '../middleware/error.js'

const router = Router()

const serviceBody = z.object({
  name: z.string().trim().min(2).max(80),
  amount: z.number().int().min(0).max(100000),
  mins: z.number().int().min(5).max(600),
  desc: z.string().trim().max(300).optional().default(''),
})

/** Loads a service and asserts the caller owns its salon. */
async function ownedService(req) {
  const service = await Service.findById(req.params.id).catch(() => null)
  if (!service) throw new ApiError(404, 'Service not found.')
  if (service.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'That service is not yours.')
  }
  return service
}

/** Public: a salon's live service menu. */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    if (!req.query.salon) throw new ApiError(400, 'A salon id is required.')
    const services = await Service.find({ salon: req.query.salon }).sort({ amount: 1 })
    res.json({ services: services.map((s) => s.toPublic()) })
  }),
)

/** Owner: add a service to one of their salons. */
router.post(
  '/',
  requireAuth,
  requireRole('owner'),
  validate(serviceBody.extend({ salonId: z.string().min(1) })),
  asyncHandler(async (req, res) => {
    const salon = await Salon.findById(req.body.salonId).catch(() => null)
    if (!salon) throw new ApiError(404, 'Salon not found.')
    if (salon.owner.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'That salon is not yours.')
    }
    const { salonId, ...body } = req.body
    const service = await Service.create({
      ...body,
      salon: salon._id,
      owner: req.user._id,
      category: salon.category,
    })
    res.status(201).json({ service: service.toPublic() })
  }),
)

/** Owner: edit one of their services. */
router.patch(
  '/:id',
  requireAuth,
  requireRole('owner'),
  validate(serviceBody.partial()),
  asyncHandler(async (req, res) => {
    const service = await ownedService(req)
    Object.assign(service, req.body)
    await service.save()
    res.json({ service: service.toPublic() })
  }),
)

/** Owner: remove one of their services. */
router.delete(
  '/:id',
  requireAuth,
  requireRole('owner'),
  asyncHandler(async (req, res) => {
    const service = await ownedService(req)
    await service.deleteOne()
    res.json({ ok: true, id: req.params.id })
  }),
)

export default router
