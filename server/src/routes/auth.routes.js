import { Router } from 'express'
import { z } from 'zod'
import { User } from '../models/User.js'
import { sendCode, checkCode } from '../lib/otp.js'
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

    // The phone decides the role; seeded staff keep their name.
    // Atomic upsert so two concurrent verifies can't both insert (E11000).
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

    // Let a returning customer update their display name.
    if (name && user.role === 'customer' && user.name !== name) {
      user.name = name
      await user.save()
    }

    res.json({ token: signToken(user), user: user.toPublic() })
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
