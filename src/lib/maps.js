/**
 * Google Maps directions link for a salon. Uses the exact pin when the salon has
 * coordinates; otherwise routes by name + address (Maps resolves it the same
 * way a customer typing it would). Opens the Maps app on phones.
 */
export function directionsUrl({ name, address, location } = {}) {
  const hasPin = location?.lat != null && location?.lng != null
  const dest = hasPin ? `${location.lat},${location.lng}` : [name, address].filter(Boolean).join(', ')
  return dest ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}` : null
}
