import { Router } from 'express'
import { Notification } from '../models/Notification.js'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/error.js'
import { audiencesForUser } from '../lib/notify.js'

const router = Router()

/** Notifications addressed to the current user's role/identity. */
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const audiences = audiencesForUser(req.user)
    const items = await Notification.find({ audience: { $in: audiences } })
      .sort({ createdAt: -1 })
      .limit(50)
    res.json({
      notifications: items.map((n) => n.toPublic()),
      unread: items.filter((n) => !n.read).length,
    })
  }),
)

/** Marks all of the current user's notifications read. */
router.post(
  '/read',
  requireAuth,
  asyncHandler(async (req, res) => {
    const audiences = audiencesForUser(req.user)
    await Notification.updateMany(
      { audience: { $in: audiences }, read: false },
      { read: true },
    )
    res.json({ ok: true })
  }),
)

export default router
