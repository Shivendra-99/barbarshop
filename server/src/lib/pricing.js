/**
 * Server-side source of truth for every rupee decision. Mirrors the frontend's
 * lib/pricing.js — but the server recomputes totals on every booking so a
 * tampered client price is ignored.
 */

export const COMMISSION_RATE = 0
export const FIRST_BOOKING_DISCOUNT_RATE = 0.1
export const BOOKING_FEE = 49 // platform fee, matches the frontend

export const ONLINE_PAYEE = 'founder'
export const OFFLINE_PAYEE = 'salon'

/**
 * Quotes a booking. The 10% discount applies only when paying online AND the
 * customer has never booked before.
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
    total,
    commission,
    salonPayout: total - commission,
    payee: paymentMode === 'online' ? ONLINE_PAYEE : OFFLINE_PAYEE,
    dueAtSalon: paymentMode === 'offline' ? total : 0,
  }
}

export const REFUND_METHODS = {
  wallet: { instant: true },
  upi: { instant: false },
}

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
