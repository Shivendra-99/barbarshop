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
    label: 'SalonSathi Wallet',
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

/**
 * Offline bookings were never collected by the platform, so there is nothing
 * to refund — the customer simply never pays.
 */
export function refundFor(booking, method) {
  if (booking.paymentMode === 'offline') {
    return { amount: 0, method: null, status: 'not_applicable' }
  }
  return {
    amount: booking.total,
    method,
    status: REFUND_METHODS[method]?.instant ? 'completed' : 'processing',
  }
}
