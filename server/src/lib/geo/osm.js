/**
 * OpenStreetMap (Nominatim) geocoder — free, no key. Our fallback because the
 * Mappls plan returns a place id (eLoc) but no coordinates. Nominatim's policy:
 * identify the app in User-Agent and stay under 1 request/second — fine for
 * salon saves and one-off backfills, never for per-keystroke lookups. Results
 * are street/neighbourhood level, not the exact shop door (owners can pin that).
 */
const UA = 'SalonSaathi/1.0 (supportsalonsaathi@gmail.com)'
const MIN_GAP_MS = 1100

// ponytail: per-instance throttle; enough for our volume. A shared queue would
// only matter if many instances geocoded at once.
let lastCall = 0

export async function osmGeocode(query) {
  if (!query) return null
  const wait = lastCall + MIN_GAP_MS - Date.now()
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  lastCall = Date.now()
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=in&q=${encodeURIComponent(query)}`
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(6000) })
    if (!res.ok) return null
    const hit = (await res.json())[0]
    const lat = Number(hit?.lat)
    const lng = Number(hit?.lon)
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
  } catch {
    return null
  }
}
