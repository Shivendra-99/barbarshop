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
export function quote({ amount, paymentMode, isFirstBooking, homeServiceFee = 0, offerPercent = 0 }) {
  // Salon offer comes off the service subtotal first.
  const pct = Math.max(0, Math.min(50, Math.round(offerPercent || 0)))
  const offerDiscount = pct > 0 ? Math.round((amount * pct) / 100) : 0
  const base = amount - offerDiscount + (homeServiceFee || 0)
  const discountEligible = paymentMode === 'online' && Boolean(isFirstBooking)
  const discount = discountEligible ? Math.round(base * FIRST_BOOKING_DISCOUNT_RATE) : 0
  const total = base - discount
  const commission = Math.round(total * COMMISSION_RATE)

  return {
    base,
    offerPercent: pct,
    offerDiscount,
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

/** The booking's slot start time as epoch ms (date "yyyy-mm-dd" + slot "HH:MM"). */
export function slotStartMs(booking) {
  const m = /^(\d{1,2}):(\d{2})/.exec(booking.slot || '')
  const [y, mo, d] = (booking.date || '').split('-').map(Number)
  if (!y || !m) return Date.now()
  return new Date(y, mo - 1, d, Number(m[1]), Number(m[2])).getTime()
}

/**
 * Cancellation fee % for a customer-initiated cancel, by how close to the slot:
 *   • 2h+ before  → 0% (wallet) / 2% (UPI, gateway cost)
 *   • within 2h   → 10%
 *   • up to 15m late → 15%
 * `now` is injectable for testing.
 */
export function cancellationFeePct(booking, method, now = Date.now()) {
  const minsUntil = (slotStartMs(booking) - now) / 60000
  if (minsUntil >= 120) return method === 'upi' ? 2 : 0
  if (minsUntil >= 0) return 10
  return 15 // late (and beyond) — the max customer self-cancel fee
}

/**
 * Refund for a customer cancel. Cash bookings never took money, so nothing to
 * refund. Online: apply the time-based fee; wallet is instant, UPI processes.
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

/**
 * Refund when the SALON marks a no-show (customer didn't turn up). Online: a
 * flat 15% penalty, 85% back to Wallet (instant) or the original UPI/bank
 * (2–3 days). The customer isn't present when the owner marks the no-show, so
 * the refund starts `pending` (no method) and the customer picks the
 * destination later from My Bookings. Cash: nothing to refund.
 */
export function noShowRefund(booking, method = null) {
  if (booking.paymentMode === 'offline') {
    return { amount: 0, fee: 0, feePct: 0, method: null, status: 'not_applicable' }
  }
  const fee = Math.round(booking.total * 0.15)
  const amount = booking.total - fee
  if (!method) return { amount, fee, feePct: 15, method: null, status: 'pending' }
  return {
    amount,
    fee,
    feePct: 15,
    method,
    status: REFUND_METHODS[method]?.instant ? 'completed' : 'processing',
  }
}

/**
 * Refund when the SALON cancels the booking — its own fault, so a FULL refund
 * with no penalty. Credited straight to the customer's Wallet (instant) since
 * the customer isn't in the loop to choose. Cash: nothing was paid.
 */
export function ownerCancelRefund(booking) {
  if (booking.paymentMode === 'offline') {
    return { amount: 0, fee: 0, feePct: 0, method: null, status: 'not_applicable' }
  }
  return { amount: booking.total, fee: 0, feePct: 0, method: 'wallet', status: 'completed' }
}
