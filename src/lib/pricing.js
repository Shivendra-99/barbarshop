/**
 * Every rupee decision lives here.
 *
 * Kept in one module deliberately: the commission is zero today but is a
 * business lever, and online payments currently settle to a single founder
 * account — which is the part that will need a licensed payment aggregator with
 * split settlement before real money moves. Isolating it means that change
 * touches this file and not the booking screens.
 */

/** Platform commission per booking. Zero for now, by decision. */
export const COMMISSION_RATE = 0

/** First-booking discount — online payments only, once per customer. */
export const FIRST_BOOKING_DISCOUNT_RATE = 0.1

/** Where online money settles. Offline never routes through the platform. */
export const ONLINE_PAYEE = 'founder'
export const OFFLINE_PAYEE = 'salon'

export const PAYMENT_MODES = {
  online: {
    id: 'online',
    label: 'Pay online',
    payee: ONLINE_PAYEE,
    note: 'Paid now. 10% off your first booking.',
  },
  offline: {
    id: 'offline',
    label: 'Pay at salon',
    payee: OFFLINE_PAYEE,
    note: 'Pay cash directly to the salon.',
  },
}

export const SERVICE_MODES = {
  salon: { id: 'salon', label: 'At salon', note: 'Visit the salon at your slot time.' },
  home: { id: 'home', label: 'Home service', note: 'The professional comes to you.' },
}

/**
 * Quotes a booking.
 *
 * The discount applies only when paying online AND the customer has never
 * completed a booking before — a second online booking gets nothing.
 */
export function quote({ amount, paymentMode, isFirstBooking, homeServiceFee = 0 }) {
  const base = amount + (homeServiceFee || 0)
  const discountEligible = paymentMode === 'online' && Boolean(isFirstBooking)
  const discount = discountEligible ? Math.round(base * FIRST_BOOKING_DISCOUNT_RATE) : 0
  const total = base - discount
  const commission = Math.round(total * COMMISSION_RATE)

  return {
    base,
    discount,
    discountEligible,
    discountRate: FIRST_BOOKING_DISCOUNT_RATE,
    total,
    commission,
    salonPayout: total - commission,
    payee: paymentMode === 'online' ? ONLINE_PAYEE : OFFLINE_PAYEE,
    /** Offline bookings are owed in cash at the chair; online are already settled. */
    dueAtSalon: paymentMode === 'offline' ? total : 0,
  }
}

export const REFUND_METHODS = {
  wallet: {
    id: 'wallet',
    label: 'SalonSaathi Wallet',
    eta: 'Instant',
    note: 'Credited immediately, usable on your next booking.',
    instant: true,
  },
  upi: {
    id: 'upi',
    label: 'Original UPI / bank',
    eta: '2–3 working days',
    note: 'Sent back to the account you paid from.',
    instant: false,
  },
}

/** Slot start as epoch ms (mirrors the server). date "yyyy-mm-dd" + slot (12h or 24h). */
export function slotStartMs(booking) {
  const m = /^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i.exec((booking.slot || '').trim())
  const [y, mo, d] = (booking.date || '').split('-').map(Number)
  if (!y || !m) return Date.now()
  let h = Number(m[1])
  const min = Number(m[2])
  if (m[3]) {
    h = h % 12
    if (/PM/i.test(m[3])) h += 12
  }
  return new Date(y, mo - 1, d, h, min).getTime()
}

/**
 * Cancellation fee % (mirrors the server). Shown in the cancel dialog so the
 * customer sees the fee before confirming; the server recomputes authoritatively.
 *   2h+ before → 0% wallet / 2% UPI · within 2h → 10% · up to 15m late → 15%.
 */
export function cancellationFeePct(booking, method, now = Date.now()) {
  const minsUntil = (slotStartMs(booking) - now) / 60000
  if (minsUntil >= 120) return method === 'upi' ? 2 : 0
  if (minsUntil >= 0) return 10
  return 15
}

/**
 * Offline bookings were never collected by the platform, so there is nothing
 * to refund. Online applies the time-based cancellation fee.
 */
export function refundFor(booking, method, now = Date.now()) {
  if (booking.paymentMode === 'offline') {
    return { amount: 0, fee: 0, feePct: 0, method: null, status: 'not_applicable' }
  }
  const feePct = cancellationFeePct(booking, method, now)
  const fee = Math.round((booking.total * feePct) / 100)
  return {
    amount: booking.total - fee,
    fee,
    feePct,
    method,
    status: REFUND_METHODS[method]?.instant ? 'completed' : 'processing',
  }
}
