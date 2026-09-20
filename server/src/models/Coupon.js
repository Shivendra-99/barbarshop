import mongoose from 'mongoose'

/**
 * A discount code. `salon: null` is a platform-wide coupon (founder-created);
 * a set `salon` is owner-created and only valid at that salon. Coupons apply to
 * online (prepaid) bookings only, and never stack — the booking takes whichever
 * single discount (this coupon vs the salon offer + first-booking) helps the
 * customer most (see quote() in lib/pricing.js).
 */
const couponSchema = new mongoose.Schema(
  {
    // Stored uppercase; the unique index makes codes case-insensitively unique.
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    description: { type: String, default: '' },

    type: { type: String, enum: ['percent', 'flat'], required: true },
    // percent: 1–90 (%). flat: rupees off.
    value: { type: Number, required: true, min: 1 },
    // Cap for a percent coupon (0 = no cap). Ignored for flat.
    maxDiscount: { type: Number, default: 0, min: 0 },
    // Minimum services subtotal required to use the coupon.
    minOrder: { type: Number, default: 0, min: 0 },

    // null = platform-wide (founder). Set = valid only at this salon (owner).
    salon: { type: mongoose.Schema.Types.ObjectId, ref: 'Salon', default: null, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // 0 = unlimited. usedCount is incremented atomically on redemption.
    usageLimit: { type: Number, default: 0, min: 0 },
    usedCount: { type: Number, default: 0, min: 0 },
    perUserLimit: { type: Number, default: 1, min: 0 }, // 0 = unlimited per user

    validFrom: { type: Date, default: null },
    validTo: { type: Date, default: null },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
)

couponSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id.toString(),
    code: this.code,
    description: this.description,
    type: this.type,
    value: this.value,
    maxDiscount: this.maxDiscount,
    minOrder: this.minOrder,
    salonId: this.salon ? this.salon.toString() : null,
    usageLimit: this.usageLimit,
    usedCount: this.usedCount,
    perUserLimit: this.perUserLimit,
    validFrom: this.validFrom,
    validTo: this.validTo,
    active: this.active,
    createdAt: this.createdAt,
  }
}

export const Coupon = mongoose.model('Coupon', couponSchema)
