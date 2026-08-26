import { env } from '../../config/env.js'
import { ApiError } from '../../middleware/error.js'

/**
 * MSG91 Server OTP API. MSG91 generates, delivers and verifies the code — we
 * never store it. Docs: https://docs.msg91.com/otp
 *
 * `mobile` must carry the country code (91 for India) with no plus sign.
 */
const BASE = 'https://control.msg91.com/api/v5'
const toMobile = (phone) => `91${phone}`

async function call(url, options) {
  let res
  try {
    res = await fetch(url, options)
  } catch {
    throw new ApiError(502, 'Could not reach the SMS provider. Try again.')
  }
  const data = await res.json().catch(() => ({}))
  return data
}

export const msg91 = {
  /** Sends an OTP SMS. MSG91 stores the code against the mobile for verify. */
  async send(phone) {
    const params = new URLSearchParams({
      template_id: env.msg91.templateId,
      mobile: toMobile(phone),
      otp_length: '6',
      otp_expiry: String(env.msg91.otpExpiryMinutes),
    })
    if (env.msg91.senderId) params.set('sender', env.msg91.senderId)

    const data = await call(`${BASE}/otp?${params.toString()}`, {
      method: 'POST',
      headers: { authkey: env.msg91.authkey, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    if (data.type !== 'success') {
      throw new ApiError(502, data.message || 'Could not send the OTP.')
    }
    return { requestId: data.request_id ?? null }
  },

  /** Verifies a submitted code. Returns { ok, reason }. */
  async verify(phone, code) {
    const params = new URLSearchParams({ otp: code, mobile: toMobile(phone) })
    const data = await call(`${BASE}/otp/verify?${params.toString()}`, {
      headers: { authkey: env.msg91.authkey },
    })
    if (data.type === 'success') return { ok: true }
    // MSG91 messages: "OTP not match", "OTP expired", etc.
    const msg = (data.message || '').toLowerCase()
    const reason = msg.includes('expire') ? 'expired' : 'mismatch'
    return { ok: false, reason }
  },

  /** Resends the OTP (text channel). */
  async resend(phone) {
    const params = new URLSearchParams({ mobile: toMobile(phone), retrytype: 'text' })
    const data = await call(`${BASE}/otp/retry?${params.toString()}`, {
      headers: { authkey: env.msg91.authkey },
    })
    if (data.type !== 'success') {
      throw new ApiError(502, data.message || 'Could not resend the OTP.')
    }
    return { ok: true }
  },
}
