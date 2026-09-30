import { Router } from 'express'
import { z } from 'zod'
import { Setting } from '../models/Setting.js'
import { validate } from '../middleware/validate.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/error.js'

const router = Router()

const view = (s) => ({
  comingSoonEnabled: s.comingSoonEnabled,
  comingSoonMessage: s.comingSoonMessage,
  firstBookingPercent: s.firstBookingPercent ?? 10,
})

/* Public: current platform settings. */
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json({ settings: view(await Setting.global()) })
  }),
)

/* Founder: update settings. */
const updateSchema = z.object({
  comingSoonEnabled: z.boolean().optional(),
  comingSoonMessage: z.string().trim().max(200).optional(),
  firstBookingPercent: z.number().int().min(0).max(50).optional(),
})
router.patch(
  '/',
  requireAuth,
  requireRole('founder'),
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    const s = await Setting.findOneAndUpdate({ key: 'global' }, req.body, {
      upsert: true,
      new: true,
    })
    res.json({ settings: view(s) })
  }),
)

export default router
