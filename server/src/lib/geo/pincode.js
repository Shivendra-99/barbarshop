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
