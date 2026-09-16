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

/**
 * Loads a service and asserts the caller may manage it. Owners can only touch
 * their own services; the founder (super admin) can manage any salon's menu.
 */
async function manageableService(req) {
  const service = await Service.findById(req.params.id).catch(() => null)
  if (!service) throw new ApiError(404, 'Service not found.')
  if (req.user.role !== 'founder' && service.owner.toString() !== req.user._id.toString()) {
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

/** Owner (own salon) or founder (any salon): add a service to a salon. */
router.post(
  '/',
  requireAuth,
  requireRole('owner', 'founder'),
  validate(serviceBody.extend({ salonId: z.string().min(1) })),
  asyncHandler(async (req, res) => {
    const salon = await Salon.findById(req.body.salonId).catch(() => null)
    if (!salon) throw new ApiError(404, 'Salon not found.')
    if (req.user.role !== 'founder' && salon.owner.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'That salon is not yours.')
    }
    const { salonId, ...body } = req.body
    const service = await Service.create({
      ...body,
      salon: salon._id,
      // Attribute the service to the salon's owner even when the founder adds it.
      owner: salon.owner,
      category: salon.category,
    })
    res.status(201).json({ service: service.toPublic() })
  }),
)

/** Owner (own) or founder (any): edit a service. */
router.patch(
  '/:id',
  requireAuth,
  requireRole('owner', 'founder'),
  validate(serviceBody.partial()),
  asyncHandler(async (req, res) => {
    const service = await manageableService(req)
    Object.assign(service, req.body)
    await service.save()
    res.json({ service: service.toPublic() })
  }),
)

/** Owner (own) or founder (any): remove a service. */
router.delete(
  '/:id',
  requireAuth,
  requireRole('owner', 'founder'),
  asyncHandler(async (req, res) => {
    const service = await manageableService(req)
    await service.deleteOne()
    res.json({ ok: true, id: req.params.id })
  }),
)

export default router
