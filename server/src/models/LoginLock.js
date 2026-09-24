import mongoose from 'mongoose'

/**
 * Wrong-OTP counter per phone. After LOGIN_MAX_FAILS wrong codes the phone is
 * locked until `lockedUntil`. Stored in Mongo (not memory) because serverless
 * instances don't share memory. Rows expire on their own via the TTL index.
 */
const loginLockSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  fails: { type: Number, default: 0 },
  lockedUntil: { type: Date, default: null },
  expiresAt: { type: Date, required: true },
})

loginLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const LoginLock = mongoose.model('LoginLock', loginLockSchema)
