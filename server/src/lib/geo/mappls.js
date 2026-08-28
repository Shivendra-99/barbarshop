import { env } from '../../config/env.js'

/**
 * Mappls (MapmyIndia) address autosuggest.
 *
 * Auth is OAuth2 client-credentials: we exchange the client id/secret for a
 * bearer token (valid ~24h) and cache it in memory, refreshing shortly before
 * expiry. Suggestions come from the Atlas search API. All of this stays on the
 * server — the browser only ever calls our /api/geo/* proxy.
 */

const TOKEN_URL = 'https://outpost.mappls.com/api/security/oauth/token'
const SEARCH_URL = 'https://atlas.mappls.com/api/places/search/json'

let cached = { token: null, expiresAt: 0 }

async function getToken() {
  if (cached.token && Date.now() < cached.expiresAt) return cached.token

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: env.mappls.clientId,
    client_secret: env.mappls.clientSecret,
  })
  const res = await fetch(TOKEN_URL, { method: 'POST', body })
  if (!res.ok) throw new Error(`Mappls auth failed (${res.status})`)
  const data = await res.json()
  if (!data.access_token) throw new Error('Mappls auth returned no token')

  // Refresh a minute early to avoid using a just-expired token.
  cached = {
    token: data.access_token,
    expiresAt: Date.now() + Math.max((data.expires_in ?? 3600) - 60, 30) * 1000,
  }
  return cached.token
}

/**
 * Returns address suggestions for a partial query. `near` ("lat,lng") biases
 * results toward the user. Each item: { name, address, eLoc }.
 */
export async function autosuggest(query, { near } = {}) {
  const token = await getToken()
  const url = new URL(SEARCH_URL)
  url.searchParams.set('query', query)
  if (near) url.searchParams.set('location', near)

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (res.status === 401) {
    // Token rejected — drop it so the next call re-authenticates.
    cached = { token: null, expiresAt: 0 }
    throw new Error('Mappls token rejected')
  }
  if (!res.ok) throw new Error(`Mappls search failed (${res.status})`)

  const data = await res.json()
  return (data.suggestedLocations ?? []).map((s) => ({
    name: s.placeName,
    address: s.placeAddress,
    eLoc: s.eLoc,
  }))
}

/**
 * Resolves an address (or eLoc) to { lat, lng } via the REST-key geocoder.
 * Returns null when the REST key is absent or the provider can't geocode it —
 * callers store the eLoc regardless and just leave coordinates null.
 */
export async function geocode({ address, eLoc } = {}) {
  if (!env.mappls.restKey) return null
  const query = eLoc || address
  if (!query) return null

  try {
    const url = `https://apis.mappls.com/advancedmaps/v1/${env.mappls.restKey}/geo_code?addr=${encodeURIComponent(query)}`
    const res = await fetch(url, { headers: { Referer: 'https://salonsaathi.in' } })
    if (!res.ok) return null
    const data = await res.json()
    const hit = data?.results?.[0] ?? data?.copResults
    const lat = Number(hit?.lat ?? hit?.latitude)
    const lng = Number(hit?.lng ?? hit?.longitude)
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng }
    return null
  } catch {
    return null
  }
}
