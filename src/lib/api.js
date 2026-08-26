/**
 * Thin API client. Reads the base URL from VITE_API_URL (falls back to the
 * local server), attaches the stored JWT, and unwraps errors into thrown
 * Error objects carrying the server's message + any field details.
 */

const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/$/, '')

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
  me: () => request('/auth/me'),

  // --- Salons ---
  publicSalons: () => request('/salons', { auth: false }),
  salon: (id) => request(`/salons/${id}`, { auth: false }),
  mySalons: () => request('/salons/mine'),
  allSalons: () => request('/salons/all'),
  pendingSalons: () => request('/salons/pending'),
  submitSalon: (draft) => request('/salons', { method: 'POST', body: draft }),
  setSalonStatus: (id, status) =>
    request(`/salons/${id}/status`, { method: 'PATCH', body: { status } }),

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

  // --- Wallet & notifications ---
  wallet: () => request('/wallet'),
  notifications: () => request('/notifications'),
  readNotifications: () => request('/notifications/read', { method: 'POST' }),
}
