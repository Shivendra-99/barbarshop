import { Router } from 'express'
import { z } from 'zod'
import { SiteReview } from '../models/SiteReview.js'
import { validate } from '../middleware/validate.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/error.js'
import { notify } from '../lib/notify.js'

const router = Router()

/** Public: average, count and the latest reviews that have a comment. */
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const [agg] = await SiteReview.aggregate([{ $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }])
    const recent = await SiteReview.find({ comment: { $ne: '' } }).sort({ updatedAt: -1 }).limit(6)
    res.json({
      avg: agg ? Math.round(agg.avg * 10) / 10 : 0,
      count: agg?.count ?? 0,
      recent: recent.map((r) => r.toPublic()),
    })
  }),
)

/** Signed-in user: their own rating (or null). */
router.get(
  '/mine',
  requireAuth,
  asyncHandler(async (req, res) => {
    const r = await SiteReview.findOne({ user: req.user._id })
    res.json({ review: r ? { rating: r.rating, comment: r.comment } : null })
  }),
)

const rateSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional().default(''),
})

/** Signed-in user: rate SalonSaathi (re-rating updates it). */
router.put(
  '/',
  requireAuth,
  validate(rateSchema),
  asyncHandler(async (req, res) => {
    const { rating, comment } = req.body
    const before = await SiteReview.findOneAndUpdate(
      { user: req.user._id },
      { rating, comment, name: req.user.name || '' },
      { upsert: true },
    )
    if (!before) {
      await notify([{
        audience: 'founder',
        tone: rating >= 4 ? 'success' : 'warn',
        title: `New website rating: ${rating}★`,
        body: comment ? `${req.user.name || 'A user'}: “${comment.slice(0, 120)}”` : `${req.user.name || 'A user'} rated SalonSaathi.`,
      }])
    }
    res.json({ review: { rating, comment } })
  }),
)

/** Founder: every rating, newest first, with who left it. */
router.get(
  '/all',
  requireAuth,
  requireRole('founder'),
  asyncHandler(async (_req, res) => {
    const rows = await SiteReview.find().sort({ updatedAt: -1 }).limit(500).populate('user', 'name phone role')
    res.json({
      reviews: rows.map((r) => ({
        id: r._id.toString(),
        rating: r.rating,
        comment: r.comment,
        ts: r.updatedAt,
        user: r.user ? { name: r.user.name, phone: r.user.phone, role: r.user.role } : null,
      })),
    })
  }),
)

export default router
