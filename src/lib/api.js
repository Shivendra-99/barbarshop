/**
 * Thin API client. Calls a same-origin `/api` by default, so the real backend
 * host is never exposed in the browser — in production a Vercel rewrite proxies
 * `/api/*` to the backend, and in local dev Vite proxies it to localhost:4000
 * (see vite.config.js). VITE_API_URL can still override the base if needed.
 * Attaches the stored JWT and unwraps errors into thrown Error objects.
 */

const BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')

const TOKEN_KEY = 'salonsathi:token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message)
    this.status = status
    this.details = details
  }
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let res
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Is it running?')
  }

  let data = null
  const text = await res.text()
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = null
    }
  }

  if (!res.ok) {
    throw new ApiError(res.status, data?.error || `Request failed (${res.status})`, data?.details)
  }
  return data
}

export const api = {
  // --- Auth ---
  requestOtp: (phone) => request('/auth/request-otp', { method: 'POST', body: { phone }, auth: false }),
  verifyOtp: (phone, code, name) =>
    request('/auth/verify-otp', { method: 'POST', body: { phone, code, name }, auth: false }),
  widgetLogin: (accessToken, phone, name) =>
    request('/auth/widget-login', { method: 'POST', body: { accessToken, phone, name }, auth: false }),
  me: () => request('/auth/me'),
  updateName: (name) => request('/auth/me', { method: 'PATCH', body: { name } }),

  // --- Owners (founder-managed) ---
  owners: () => request('/users/owners'),
  addOwner: (body) => request('/users/owners', { method: 'POST', body }),

  // --- Salons ---
  publicSalons: () => request('/salons', { auth: false }),
  salon: (id) => request(`/salons/${id}`, { auth: false }),
  mySalons: () => request('/salons/mine'),
  allSalons: () => request('/salons/all'),
  pendingSalons: () => request('/salons/pending'),
  submitSalon: (draft) => request('/salons', { method: 'POST', body: draft }),
  setSalonStatus: (id, status) =>
    request(`/salons/${id}/status`, { method: 'PATCH', body: { status } }),
  updateSalon: (id, body) => request(`/salons/${id}`, { method: 'PATCH', body }),

  // --- Services (per salon, owner-managed) ---
  salonServices: (salonId) => request(`/services?salon=${salonId}`, { auth: false }),
  addService: (body) => request('/services', { method: 'POST', body }),
  updateService: (id, body) => request(`/services/${id}`, { method: 'PATCH', body }),
  deleteService: (id) => request(`/services/${id}`, { method: 'DELETE' }),

  // --- Bookings ---
  createBooking: (draft) => request('/bookings', { method: 'POST', body: draft }),
  myBookings: () => request('/bookings/mine'),
  ownerBookings: () => request('/bookings/owner'),
  allBookings: () => request('/bookings/all'),
  cancelBooking: (id, method) =>
    request(`/bookings/${id}/cancel`, { method: 'POST', body: { method } }),
  rescheduleBooking: (id, body) =>
    request(`/bookings/${id}/reschedule`, { method: 'PATCH', body }),
  completeBooking: (id) => request(`/bookings/${id}/complete`, { method: 'PATCH' }),
  rateBooking: (id, body) => request(`/bookings/${id}/rate`, { method: 'POST', body }),
  bookingQueue: (id) => request(`/bookings/${id}/queue`),

  // --- Address autosuggest (Mappls, via our proxy) ---
  autosuggestAddress: (q, near) =>
    request(`/geo/autosuggest?q=${encodeURIComponent(q)}${near ? `&near=${encodeURIComponent(near)}` : ''}`),
  // India Post PIN lookup → { pincode, state, district, city, areas }
  pincode: (pin) => request(`/geo/pincode/${encodeURIComponent(pin)}`, { auth: false }),
  // Reverse geocode (browser coords) → { city, district, state, pincode }
  reverseGeocode: (lat, lng) => request(`/geo/reverse?lat=${lat}&lng=${lng}`, { auth: false }),
  // City-name search → { results: [{ label, city, state, pincode }] }
  searchLocations: (q) => request(`/geo/search?q=${encodeURIComponent(q)}`, { auth: false }),

  // --- Platform settings (founder-managed) ---
  settings: () => request('/settings', { auth: false }),
  updateSettings: (body) => request('/settings', { method: 'PATCH', body }),

  // --- Wallet & notifications ---
  wallet: () => request('/wallet'),
  notifications: () => request('/notifications'),
  readNotifications: () => request('/notifications/read', { method: 'POST' }),
}
