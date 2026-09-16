import { env } from '../../config/env.js'
import { User } from '../../models/User.js'

/**
 * Delivers real-time SMS & WhatsApp booking alerts to the salon owner.
 *
 * When a customer books or reschedules an appointment:
 * 1. Resolves owner phone: both salon.phone and salon.owner (User phone).
 * 2. Formats all booking details (customer name, phone, service, date, 12h time, ref, amount, mode).
 * 3. Dispatches via MSG91 Flow API (which delivers across SMS and/or WhatsApp based on
 *    the Flow configured in your MSG91 dashboard).
 * 4. Logs full request and delivery responses for traceability.
 */

const MSG91_FLOW = 'https://control.msg91.com/api/v5/flow/'

const cleanPhone = (p) => {
  if (!p) return null
  const d = String(p).replace(/\D/g, '')
  if (d.length === 10) return d
  if (d.length === 12 && d.startsWith('91')) return d.slice(2)
  return null
}

const toMobile = (phone) => `91${cleanPhone(phone)}`

export async function sendOwnerBookingAlert({ booking, salon, user, isReschedule = false }) {
  if (!booking || !salon) return

  let ownerUser = null
  if (salon.owner) {
    ownerUser = await User.findById(salon.owner).catch(() => null)
  }

  const ownerPhone = cleanPhone(ownerUser?.phone)
  const salonPhone = cleanPhone(salon.phone)

  // Deduplicate target phone numbers
  const targetPhones = Array.from(new Set([ownerPhone, salonPhone].filter(Boolean)))

  if (!targetPhones.length) {
    // eslint-disable-next-line no-console
    console.log(`[ownerAlert] No valid phone number found for salon "${salon.name}". Cannot send alert.`)
    return
  }

  const flowId = env.msg91.ownerFlowId || env.msg91.bookingFlowId || env.msg91.templateId || ''

  if (!env.msg91.authkey || !flowId) {
    // eslint-disable-next-line no-console
    console.log(
      `[ownerAlert] ${isReschedule ? 'Rescheduled' : 'New'} booking #${booking.ref} for "${salon.name}" → Alert targets: +91 ${targetPhones.join(', +91 ')} [MSG91 authkey or flowId not set]`
    )
    return
  }

  const customerName = user?.name || booking.customerName || 'Customer'
  const customerPhone = user?.phone || booking.customerPhone || ''
  const serviceName = booking.serviceName || 'Salon Service'
  const dateStr = booking.dateLabel || booking.date || ''
  const timeStr = booking.slot || ''
  const modeStr = booking.modeLabel || (booking.mode === 'home' ? 'Home Service' : 'At Salon')
  const paymentStr = booking.paymentMode === 'online' ? 'Paid Online' : 'Cash at Salon'
  const totalStr = String(booking.total || 0)
  const refStr = String(booking.ref || '')
  const addressStr = booking.address || 'At Salon'

  for (const phone of targetPhones) {
    try {
      const recipientVars = {
        mobiles: toMobile(phone),
        SALON_NAME: salon.name,
        salon_name: salon.name,
        CUSTOMER_NAME: customerName,
        customer_name: customerName,
        CUSTOMER_PHONE: customerPhone,
        customer_phone: customerPhone,
        SERVICE: serviceName,
        service: serviceName,
        DATE: dateStr,
        date: dateStr,
        TIME: timeStr,
        time: timeStr,
        MODE: modeStr,
        mode: modeStr,
        PAYMENT: paymentStr,
        payment: paymentStr,
        TOTAL: totalStr,
        total: totalStr,
        REF: refStr,
        ref: refStr,
        ADDRESS: addressStr,
        address: addressStr,
        EVENT: isReschedule ? 'Booking Rescheduled' : 'New Booking',
      }

      const res = await fetch(MSG91_FLOW, {
        method: 'POST',
        headers: {
          authkey: env.msg91.authkey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template_id: flowId,
          sender: env.msg91.senderId || undefined,
          short_url: '0',
          recipients: [recipientVars],
        }),
      })

      const data = await res.json().catch(() => ({}))
      // eslint-disable-next-line no-console
      console.log(
        `[ownerAlert] Sent ${isReschedule ? 'reschedule' : 'booking'} alert for #${refStr} to +91 ${phone} →`,
        JSON.stringify(data)
      )
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log(`[ownerAlert] Failed to send alert to +91 ${phone}:`, err.message)
    }
  }
}
