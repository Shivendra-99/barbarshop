import mongoose from 'mongoose'
import { ROLES } from '../config/roles.js'

const userSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ROLES, default: 'customer', index: true },
    // Seeded staff carry a stable code (own-1, etc.) used to wire seed salons.
    code: { type: String, default: null },
    walletBalance: { type: Number, default: 0 },
    // Cash-booking abuse guard: cancels/no-shows on cash bookings. At 3 the
    // customer is blocked from cash and can only pay online; a completed cash
    // service resets it to 0.
    cashCancelCount: { type: Number, default: 0 },
    cashBlocked: { type: Boolean, default: false },
    // Owner-only accountability: how many of their own bookings this owner has
    // cancelled (salon's fault → full customer refund). Tracked so abuse is
    // visible; no auto-penalty yet.
    ownerCancelCount: { type: Number, default: 0 },
    // Platform-wide block set by the founder: a blocked account can't sign in or
    // act (applies to customers and owners alike).
    blocked: { type: Boolean, default: false },
    // Owner-only: phone numbers this owner has blocked from booking at THEIR
    // salons. A per-owner list, not a platform ban.
    blockedCustomers: { type: [String], default: [] },
  },
  { timestamps: true },
)

userSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id.toString(),
    phone: this.phone,
    name: this.name,
    role: this.role,
    walletBalance: this.walletBalance,
    cashBlocked: this.cashBlocked ?? false,
    cashCancelCount: this.cashCancelCount ?? 0,
    blocked: this.blocked ?? false,
  }
}

export const User = mongoose.model('User', userSchema)
