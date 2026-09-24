import { geocode as mapplsGeocode } from './mappls.js'
import { osmGeocode } from './osm.js'

/** Join address parts, dropping repeats ("Hazratganj, Hazratganj" breaks lookups). */
function joinParts(...parts) {
  const seen = new Set()
  const out = []
  for (const piece of parts.join(',').split(',')) {
    const p = piece.trim()
    if (p && !seen.has(p.toLowerCase())) {
      seen.add(p.toLowerCase())
      out.push(p)
    }
  }
  return out.join(', ')
}

/** Most- to least-specific lookups for a salon: full address, area, PIN code, city. */
export function salonQueries({ address = '', area = '', district = '', city = '', pin = '' }) {
  const place = district || city
  const postal = pin || (String(address).match(/\b\d{6}\b/) || [])[0] || ''
  return [
    joinParts(address, area, place),
    joinParts(area, place),
    postal && `${postal}, India`,
    place,
  ].filter(Boolean)
}

/**
 * Coordinates for the first query that resolves: Mappls first (exact when the
 * plan returns coordinates — ours currently doesn't), then OpenStreetMap.
 * Returns { lat, lng, source } or null. Never throws.
 */
export async function geocodeFirst(queries, { eLoc } = {}) {
  const list = [...new Set(queries.filter(Boolean))]
  const m = await mapplsGeocode({ eLoc, address: list[0] })
  if (m) return { ...m, source: 'mappls' }
  for (const q of list) {
    const hit = await osmGeocode(q)
    if (hit) return { ...hit, source: 'auto' }
  }
  return null
}
