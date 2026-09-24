/** Straight-line distance in km between two { lat, lng } points (haversine). */
export function distanceKm(a, b) {
  if (a?.lat == null || a?.lng == null || b?.lat == null || b?.lng == null) return null
  const rad = (d) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(h))
}

/**
 * "450 m" / "1.2 km" / "18 km". Salon pins are often area-level, so a
 * distance is shown as approximate ("~") unless the owner set an exact pin.
 */
export function formatKm(km, exact = false) {
  if (km == null) return null
  const approx = exact ? '' : '~'
  if (km < 1) return `${approx}${Math.max(50, Math.round(km * 20) * 50)} m`
  return `${approx}${km < 10 ? km.toFixed(1) : Math.round(km)} km`
}

/** Distance label from the customer's position to a salon, or null if unknown. */
export function salonDistance(coords, salon) {
  const km = distanceKm(coords, salon?.location)
  return km == null ? null : formatKm(km, salon.location?.source === 'pin')
}
