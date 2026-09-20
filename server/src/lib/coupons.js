import { Coupon } from '../models/Coupon.js'
import { CouponRedemption } from '../models/CouponRedemption.js'
import { ApiError } from '../middleware/error.js'
import { formatINR } from './money.js'

/**
 * Validate a coupon code for a customer + salon + services subtotal and return
 * the Coupon doc, or throw ApiError with a customer-facing message. Coupons are
 * online-only, so callers must only invoke this for online bookings. This does
 * NOT decide best-of — quote() decides whether the coupon actually beats the
 * automatic discounts; here we only check the coupon is usable at all.
 */
export async function resolveCoupon({ code, salonId, user, subtotal }) {
  const norm = String(code || '').trim().toUpperCase()
  if (!norm) throw new ApiError(400, 'Enter a coupon code.')

  const coupon = await Coupon.findOne({ code: norm }).catch(() => null)
  if (!coupon || !coupon.active) throw new ApiError(400, 'This coupon is not valid.')

  const now = Date.now()
  if (coupon.validFrom && now < coupon.validFrom.getTime()) {
    throw new ApiError(400, 'This coupon is not active yet.')
  }
  if (coupon.validTo && now > coupon.validTo.getTime()) {
    throw new ApiError(400, 'This coupon has expired.')
  }
  // Salon scope: platform coupons (salon null) work anywhere; a salon coupon
  // only at its own salon.
  if (coupon.salon && coupon.salon.toString() !== String(salonId)) {
    throw new ApiError(400, 'This coupon is not valid for this salon.')
  }
  if (coupon.minOrder > 0 && subtotal < coupon.minOrder) {
    throw new ApiError(400, `This coupon needs a minimum order of ${formatINR(coupon.minOrder)}.`)
  }
  // ponytail: usage-limit check is non-transactional — two concurrent bookings
  // could each grab the last slot. Acceptable (over-redeem by ~1); a hard cap
  // would mean charging online then failing, which is worse.
  if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
    throw new ApiError(400, 'This coupon has reached its usage limit.')
  }
  if (coupon.perUserLimit > 0) {
    const mine = await CouponRedemption.countDocuments({ coupon: coupon._id, user: user._id })
    if (mine >= coupon.perUserLimit) {
      throw new ApiError(400, 'You have already used this coupon.')
    }
  }
  return coupon
}

/** The subset of a coupon quote() needs to compute the discount. */
export const couponForQuote = (coupon) =>
  coupon ? { code: coupon.code, type: coupon.type, value: coupon.value, maxDiscount: coupon.maxDiscount } : null

/**
 * Record a redemption and bump usedCount, exactly once per booking. The unique
 * (coupon, booking) index makes a re-run for the same booking a no-op, so
 * usedCount is never double-counted.
 */
export async function redeemCoupon({ coupon, user, booking, code, discount }) {
  if (!coupon || !(discount > 0)) return
  try {
    await CouponRedemption.create({
      coupon: coupon._id,
      user: user._id,
      booking: booking._id,
      bookingRef: booking.ref,
      code,
      discount,
    })
    await Coupon.updateOne({ _id: coupon._id }, { $inc: { usedCount: 1 } })
  } catch {
    // Duplicate redemption for this booking — already counted, ignore.
  }
}
