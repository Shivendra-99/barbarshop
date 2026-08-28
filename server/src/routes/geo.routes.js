import { Router } from 'express'
import { mapplsEnabled } from '../config/env.js'
import { autosuggest } from '../lib/geo/mappls.js'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/error.js'

const router = Router()

/**
 * Address autosuggest proxy. Signed-in users only (keeps our Mappls quota from
 * anonymous abuse). Returns [] for short queries or when Mappls isn't
 * configured, so the client falls back to a plain text field.
 */
router.get(
  '/autosuggest',
  requireAuth,
  asyncHandler(async (req, res) => {
    const q = (req.query.q ?? '').toString().trim()
    if (q.length < 3) return res.json({ suggestions: [] })
    if (!mapplsEnabled()) return res.json({ suggestions: [], disabled: true })

    const near = (req.query.near ?? '').toString().trim() || undefined
    try {
      const suggestions = await autosuggest(q, { near })
      res.json({ suggestions })
    } catch {
      // Never break the address field on a provider hiccup — degrade to plain text.
      res.json({ suggestions: [], error: true })
    }
  }),
)

export default router
