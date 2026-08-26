import bcrypt from 'bcryptjs'
import { Otp } from '../models/Otp.js'
import { env, msg91Enabled } from '../config/env.js'
import { msg91 } from './sms/msg91.js'

/**
 * OTP dispatch. With MSG91 configured, the provider generates, sends and
 * verifies the code. Without it, a local dev flow runs: a random code is
 * hashed + stored and returned in the API response (no SMS) so you can sign in
 * during development.
 */

export const otpMode = () => (msg91Enabled() ? 'msg91' : 'dev')

/* ------------------------- Local dev flow ------------------------- */

const genCode = () => String(Math.floor(100000 + Math.random() * 900000))

async function devSend(phone) {
  const code = genCode()
  const codeHash = await bcrypt.hash(code, 10)
  const expiresAt = new Date(Date.now() + env.otpTtlMinutes * 60 * 1000)
  await Otp.findOneAndReplace({ phone }, { phone, codeHash, attempts: 0, expiresAt }, { upsert: true })
  // eslint-disable-next-line no-console
  console.log(`[otp:dev] code for +91 ${phone} is ${code}`)
  return { devCode: env.otpDevReturn ? code : undefined }
}

async function devVerify(phone, code) {
  const record = await Otp.findOne({ phone })
  if (!record) return { ok: false, reason: 'no_code' }
  if (record.expiresAt <= new Date()) {
    await record.deleteOne()
    return { ok: false, reason: 'expired' }
  }
  if (record.attempts >= env.otpMaxAttempts) {
    await record.deleteOne()
    return { ok: false, reason: 'too_many_attempts' }
  }
  const match = await bcrypt.compare(code, record.codeHash)
  if (!match) {
    record.attempts += 1
    await record.save()
    return { ok: false, reason: 'mismatch' }
  }
  await record.deleteOne()
  return { ok: true }
}

/* --------------------------- Dispatch ---------------------------- */

/** Sends a code. Returns `{ devCode? }` (present only in the dev flow). */
export async function sendCode(phone) {
  return msg91Enabled() ? msg91.send(phone) : devSend(phone)
}

/** Verifies a code. Returns `{ ok, reason? }`. */
export async function checkCode(phone, code) {
  return msg91Enabled() ? msg91.verify(phone, code) : devVerify(phone, code)
}

/** Resends a code (MSG91 has a dedicated retry; dev just re-issues). */
export async function resendCode(phone) {
  return msg91Enabled() ? msg91.resend(phone) : devSend(phone)
}
