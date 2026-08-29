/**
 * India Post PIN code lookup (free, no key). Resolves a 6-digit pincode to
 * state / district / localities so address forms can autofill and location can
 * cover all of India. We treat the postal District as the "city" key, since
 * India Post has no separate city field.
 */
export async function lookupPincode(pin) {
  let res
  try {
    res = await fetch(`https://api.postalpincode.in/pincode/${encodeURIComponent(pin)}`)
  } catch {
    return null
  }
  if (!res.ok) return null

  const data = await res.json().catch(() => null)
  const entry = Array.isArray(data) ? data[0] : null
  if (!entry || entry.Status !== 'Success' || !entry.PostOffice?.length) return null

  const offices = entry.PostOffice
  const first = offices[0]
  const areas = [...new Set(offices.map((o) => o.Name).filter(Boolean))]

  return {
    pincode: String(pin),
    state: first.State,
    district: first.District,
    city: first.District, // India Post has no distinct city; District is closest
    areas,
  }
}

/**
 * Keyless reverse geocode via OpenStreetMap Nominatim: { lat, lng } →
 * { postcode, city, district, state }. Nominatim asks for a descriptive
 * User-Agent. Returns null on failure.
 */
export async function reverseViaOsm(lat, lng) {
  let res
  try {
    res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&format=json&addressdetails=1`,
      { headers: { 'User-Agent': 'SalonSathi/1.0 (support@salonsaathi.in)' } },
    )
  } catch {
    return null
  }
  if (!res.ok) return null

  const data = await res.json().catch(() => null)
  const a = data?.address
  if (!a) return null

  const city = a.city || a.town || a.village || a.municipality || a.state_district || a.county || ''
  return {
    postcode: a.postcode || '',
    city,
    district: a.state_district || a.county || city,
    state: a.state || '',
  }
}
