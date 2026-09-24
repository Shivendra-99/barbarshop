import { LoginLock } from '../models/LoginLock.js'
import { ApiError } from '../middleware/error.js'
import { env } from '../config/env.js'

const lockMs = () => env.loginLockMinutes * 60 * 1000
const minsLeft = (until) => Math.max(1, Math.ceil((until.getTime() - Date.now()) / 60000))

export const lockedMessage = (mins) =>
  `Login locked after ${env.loginMaxFails} wrong codes. Try again in ${mins} min.`

/** Throws 429 while the phone is locked out. */
export async function assertNotLocked(phone) {
  const row = await LoginLock.findOne({ phone }).catch(() => null)
  if (row?.lockedUntil && row.lockedUntil > new Date()) {
    throw new ApiError(429, lockedMessage(minsLeft(row.lockedUntil)))
  }
}

/**
 * Count one wrong code. Returns { locked, left }: `left` is the attempts
 * remaining before the lock; `locked` is true when this failure tripped it.
 */
export async function recordFailure(phone) {
  const expiresAt = new Date(Date.now() + lockMs())
  const row = await LoginLock.findOneAndUpdate(
    { phone },
    { $inc: { fails: 1 }, $set: { expiresAt } },
    { upsert: true, new: true },
  )
  if (row.fails >= env.loginMaxFails) {
    // Lock now and reset the counter, so the next window starts clean.
    await LoginLock.updateOne({ phone }, { fails: 0, lockedUntil: expiresAt, expiresAt })
    return { locked: true, left: 0 }
  }
  return { locked: false, left: env.loginMaxFails - row.fails }
}

/** A successful login wipes the counter. */
export const clearFailures = (phone) => LoginLock.deleteOne({ phone }).catch(() => {})
