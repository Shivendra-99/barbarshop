import crypto from 'node:crypto'
import { env, razorpayEnabled } from '../config/env.js'
import { ApiError } from '../middleware/error.js'

const API = 'https://api.razorpay.com/v1'

/** Basic-auth header for the Razorpay REST API (keyId:keySecret). */
function authHeader() {
  const token = Buffer.from(`${env.razorpay.keyId}:${env.razorpay.keySecret}`).toString('base64')
  return `Basic ${token}`
}

/**
 * Create a Razorpay order. `amount` is in the major unit (rupees); we convert
 * to paise here. Returns the order object ({ id, amount, currency, ... }).
 */
export async function createOrder({ amount, currency = 'INR', receipt, notes }) {
  if (!razorpayEnabled()) throw new ApiError(503, 'Online payments are not configured.')

  const paise = Math.round(amount * 100)
  let res
  try {
    res = await fetch(`${API}/orders`, {
      method: 'POST',
      headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: paise, currency, receipt, notes, payment_capture: 1 }),
    })
  } catch {
    throw new ApiError(502, 'Could not reach the payment gateway.')
  }

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new ApiError(502, data?.error?.description || 'Could not create the payment order.')
  }
  return data
}

/**
 * Verify a Checkout callback: HMAC-SHA256(orderId|paymentId, keySecret) must
 * equal the signature Razorpay returned. Constant-time compare.
 */
export function verifySignature({ orderId, paymentId, signature }) {
  if (!orderId || !paymentId || !signature) return false
  const expected = crypto
    .createHmac('sha256', env.razorpay.keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  } catch {
    return false
  }
}
