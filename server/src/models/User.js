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
  }
}

export const User = mongoose.model('User', userSchema)
