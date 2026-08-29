import { Router } from 'express'
import { mapplsEnabled } from '../config/env.js'
import { autosuggest, reverseGeocode } from '../lib/geo/mappls.js'
import { lookupPincode } from '../lib/geo/pincode.js'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler, ApiError } from '../middleware/error.js'

const router = Router()

/**
 * India Post PIN lookup → { pincode, state, district, city, areas }. Public
 * (public data, and used by the anonymous location picker). 404 for unknown pins.
 */
router.get(
  '/pincode/:pin',
  asyncHandler(async (req, res) => {
    const pin = String(req.params.pin || '')
    if (!/^\d{6}$/.test(pin)) throw new ApiError(400, 'Enter a valid 6-digit PIN code.')
    const result = await lookupPincode(pin)
    if (!result) throw new ApiError(404, 'No location found for that PIN code.')
    res.json(result)
  }),
)

/**
 * Reverse geocode a coordinate (from the browser) to a city — for auto-detecting
 * the visitor's location. Public. Returns {} when it can't resolve.
 */
router.get(
  '/reverse',
  asyncHandler(async (req, res) => {
    const lat = Number(req.query.lat)
    const lng = Number(req.query.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new ApiError(400, 'Valid lat and lng are required.')
    }
    const result = await reverseGeocode(lat, lng)
    if (!result) throw new ApiError(404, 'Could not resolve that location.')
    res.json(result)
  }),
)

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
