import { Router } from 'express'
import { z } from 'zod'
import { User } from '../models/User.js'
import { sendCode, checkCode } from '../lib/otp.js'
import { msg91 } from '../lib/sms/msg91.js'
import { signToken } from '../lib/jwt.js'
import { identityForPhone } from '../config/roles.js'
import { validate } from '../middleware/validate.js'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler, ApiError } from '../middleware/error.js'

const router = Router()

const phoneField = z
  .string()
  .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number.')

const requestSchema = z.object({ phone: phoneField })
const verifySchema = z.object({
  phone: phoneField,
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code.'),
  name: z.string().trim().min(1).max(60).optional(),
})
const widgetSchema = z.object({
  accessToken: z.string().min(10),
  name: z.string().trim().min(1).max(60).optional(),
  phone: phoneField.optional(),
})

/** Finds or creates the user for a verified phone and returns our JWT + user. */
async function issueSession(phone, name) {
  // The phone decides the role; seeded staff keep their name.
  // Atomic upsert so two concurrent logins can't both insert (E11000).
  const identity = identityForPhone(phone)
  const user = await User.findOneAndUpdate(
    { phone },
    {
      $setOnInsert: {
        phone,
        name: identity.name ?? name ?? 'Guest',
        role: identity.role,
        code: identity.code ?? null,
      },
    },
    { upsert: true, new: true },
  )
  if (name && user.role === 'customer' && user.name !== name) {
    user.name = name
    await user.save()
  }
  return { token: signToken(user), user: user.toPublic() }
}

/** Step 1 — send an OTP. */
router.post(
  '/request-otp',
  validate(requestSchema),
  asyncHandler(async (req, res) => {
    const { phone } = req.body
    const result = await sendCode(phone)
    res.json({
      sent: true,
      // Present only in the dev flow (no SMS carrier configured).
      ...(result.devCode ? { devCode: result.devCode } : {}),
    })
  }),
)

/** Step 2 — verify the OTP, upsert the user, and return a token. */
router.post(
  '/verify-otp',
  validate(verifySchema),
  asyncHandler(async (req, res) => {
    const { phone, code, name } = req.body

    const result = await checkCode(phone, code)
    if (!result.ok) {
      const messages = {
        no_code: 'Request a code first.',
        expired: 'That code has expired. Request a new one.',
        too_many_attempts: 'Too many attempts. Request a new code.',
        mismatch: 'That code is incorrect.',
      }
      throw new ApiError(400, messages[result.reason] ?? 'Verification failed.')
    }

    res.json(await issueSession(phone, name))
  }),
)

/**
 * Widget flow — verifies the MSG91 OTP-widget access-token (the browser already
 * sent + verified the OTP) and issues our session. The verified phone comes from
 * MSG91, not the client.
 */
router.post(
  '/widget-login',
  validate(widgetSchema),
  asyncHandler(async (req, res) => {
    const { accessToken, name } = req.body

    const result = await msg91.verifyAccessToken(accessToken)
    if (!result.ok) throw new ApiError(400, 'OTP verification failed. Please try again.')

    // MSG91 returns the verified identifier (e.g. "919936120982").
    const digits = result.identifier.replace(/\D/g, '')
    const phone = digits.length > 10 ? digits.slice(-10) : digits
    if (!/^[6-9]\d{9}$/.test(phone)) {
      // Fall back to the client-supplied phone only if MSG91 gave nothing usable.
      if (!req.body.phone) throw new ApiError(400, 'Could not read the verified number.')
      return res.json(await issueSession(req.body.phone, name))
    }

    res.json(await issueSession(phone, name))
  }),
)

/** Returns the current user for a stored token (session restore). */
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user.toPublic() })
  }),
)

export default router
