import { env } from '../../config/env.js'
import { User } from '../../models/User.js'

/**
 * One place for every MSG91 Flow SMS. Each booking event calls sendFlowSms with
 * the flow id for its DLT-approved template and the variables that template
 * expects (keys must match the variable names configured in the MSG91 flow).
 *
 * Best-effort: never throws — a delivery failure must not break a booking. When
 * the flow id or authkey isn't set it just logs, so local dev works without SMS.
 */
const MSG91_FLOW = 'https://control.msg91.com/api/v5/flow/'

/** Normalise any phone to a bare 10-digit Indian number (or null). */
export const cleanPhone = (p) => {
  if (!p) return null
  const d = String(p).replace(/\D/g, '')
  if (d.length === 10) return d
  if (d.length === 12 && d.startsWith('91')) return d.slice(2)
  return null
}

/** "16:30" or "4:30 PM" → "4:30 PM" (12-hour, for message text). */
function to12h(slot) {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)?/i.exec((slot || '').trim())
  if (!m) return (slot || '').trim()
  if (m[3]) return `${Number(m[1])}:${m[2]} ${m[3].toUpperCase()}`
  let h = Number(m[1])
  const ap = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${m[2]} ${ap}`
}

/** The single WHEN variable: "18 Sep 2026, 4:30 PM" (dodges DLT adjacent-vars). */
export const bookingWhen = (b) => `${b.dateLabel || b.date || ''}, ${to12h(b.slot)}`

/** Deduped owner-reachable numbers for a salon: the owner's phone + the salon's. */
export async function resolveOwnerPhones(salon) {
  if (!salon) return []
  const ownerUser = salon.owner ? await User.findById(salon.owner).catch(() => null) : null
  return Array.from(new Set([cleanPhone(ownerUser?.phone), cleanPhone(salon.phone)].filter(Boolean)))
}

export async function sendFlowSms({ flowId, phone, vars, label = 'sms' }) {
  const mobile = cleanPhone(phone)
  if (!mobile) return
  if (!env.msg91.authkey || !flowId) {
    // eslint-disable-next-line no-console
    console.log(`[sms:${label}] +91 ${mobile} [not configured]`)
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
        recipients: [{ mobiles: `91${mobile}`, ...vars }],
      }),
    })
    const data = await res.json().catch(() => ({}))
    // eslint-disable-next-line no-console
    console.log(`[sms:${label}] +91 ${mobile} →`, JSON.stringify(data))
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log(`[sms:${label}] failed +91 ${mobile}:`, err.message)
  }
}
