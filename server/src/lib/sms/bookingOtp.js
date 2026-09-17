import { env } from '../../config/env.js'

/**
 * Best-effort delivery of a booking's completion OTP over SMS + WhatsApp.
 *
 * The website (My Bookings) and the in-app notification are the guaranteed
 * channels; this adds SMS/WhatsApp when MSG91 transactional Flow / WhatsApp are
 * configured. It NEVER throws — a delivery failure must not break a booking.
 *
 * To enable real SMS: create a MSG91 Flow (DLT-approved template with ##OTP##
 * and ##REF## vars) and set MSG91_BOOKING_FLOW_ID. WhatsApp needs the MSG91
 * WhatsApp API set up similarly (left as a hook below).
 */
const MSG91_FLOW = 'https://control.msg91.com/api/v5/flow/'
const toMobile = (phone) => `91${phone}`

export async function sendBookingOtp({ phone, otp, ref }) {
  if (!phone || !otp) return
  const flowId = env.msg91.bookingFlowId || process.env.MSG91_BOOKING_FLOW_ID || env.msg91.templateId || ''

  // Dev / not-configured: log so it's visible without a provider.
  if (!env.msg91.authkey || !flowId) {
    // eslint-disable-next-line no-console
    console.log(`[bookingOtp] +91 ${phone} → OTP ${otp} (${ref}) [sms not configured]`)
    return
  }

  try {
    const res = await fetch(MSG91_FLOW, {
      method: 'POST',
      headers: { authkey: env.msg91.authkey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template_id: flowId,
        sender: env.msg91.senderId || undefined,
        short_url: '0',
        recipients: [{ mobiles: toMobile(phone), OTP: otp, REF: ref }],
      }),
    })
    const data = await res.json().catch(() => ({}))
    // eslint-disable-next-line no-console
    console.log(`[bookingOtp] +91 ${phone} sent →`, JSON.stringify(data))
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log(`[bookingOtp] send failed for +91 ${phone}:`, err.message)
  }
}
