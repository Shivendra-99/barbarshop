import mongoose from 'mongoose'

/**
 * One row per time a coupon is used on a booking — the audit trail behind the
 * per-user and total usage limits. Written when the booking is created; kept
 * even if the booking is later cancelled, so a coupon can't be farmed by
 * booking-and-cancelling (mirrors the first-booking discount rule).
 */
const couponRedemptionSchema = new mongoose.Schema(
  {
    coupon: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    bookingRef: { type: String, default: null },
    code: { type: String, default: null },
    discount: { type: Number, default: 0 },
  },
  { timestamps: true },
)

// One redemption per booking — a retry that re-creates the same booking can't
// double-count. (Per-user and total limits are enforced by counting/usedCount.)
couponRedemptionSchema.index({ coupon: 1, booking: 1 }, { unique: true })

export const CouponRedemption = mongoose.model('CouponRedemption', couponRedemptionSchema)
