import { Router } from 'express'
import { z } from 'zod'
import { User } from '../models/User.js'
import { WalletTxn } from '../models/WalletTxn.js'
import { Withdrawal } from '../models/Withdrawal.js'
import { validate } from '../middleware/validate.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { asyncHandler, ApiError } from '../middleware/error.js'
import { notify } from '../lib/notify.js'
import { formatINR } from '../lib/money.js'

const router = Router()

export const MIN_WITHDRAWAL = 500
export const INSTANT_FEE_RATE = 0.07 // 7%

const createSchema = z.object({
  amount: z.number().int().min(1),
  method: z.enum(['instant', 'weekly']),
})

/** Owner: withdrawal history + the rules. */
router.get(
  '/',
  requireAuth,
  requireRole('owner'),
  asyncHandler(async (req, res) => {
    const withdrawals = await Withdrawal.find({ owner: req.user._id }).sort({ createdAt: -1 })
    res.json({
      balance: req.user.walletBalance,
      min: MIN_WITHDRAWAL,
      instantFeeRate: INSTANT_FEE_RATE,
      withdrawals: withdrawals.map((w) => w.toPublic()),
    })
  }),
)

/** Owner: request a withdrawal. Debits the wallet (gross) immediately. */
router.post(
  '/',
  requireAuth,
  requireRole('owner'),
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const { amount, method } = req.body

    if (amount < MIN_WITHDRAWAL) {
      throw new ApiError(400, `Minimum withdrawal is ${formatINR(MIN_WITHDRAWAL)}.`)
    }
    // Re-read the balance to avoid acting on a stale token snapshot.
    const owner = await User.findById(req.user._id)
    if ((owner.walletBalance || 0) < amount) {
      throw new ApiError(400, 'Amount is more than your wallet balance.')
    }

    const fee = method === 'instant' ? Math.round(amount * INSTANT_FEE_RATE) : 0
    const net = amount - fee

    // Debit the gross now; the team pays out `net`.
    const balanceAfter = owner.walletBalance - amount
    await User.updateOne({ _id: owner._id }, { walletBalance: balanceAfter })
    await WalletTxn.create({
      user: owner._id,
      type: 'debit',
      amount,
      note:
        method === 'instant'
          ? `Instant withdrawal (7% fee ${formatINR(fee)})`
          : 'Weekly withdrawal request',
      balanceAfter,
    })

    const withdrawal = await Withdrawal.create({
      owner: owner._id,
      amount,
      fee,
      net,
      method,
      // Instant is actioned now; weekly waits for the Sunday batch.
      status: method === 'instant' ? 'processing' : 'pending',
    })

    await notify([
      {
        audience: `owner:${owner._id.toString()}`,
        tone: 'success',
        title: 'Withdrawal requested',
        body:
          method === 'instant'
            ? `${formatINR(net)} on its way (7% fee ${formatINR(fee)}).`
            : `${formatINR(net)} will be settled this Sunday (0% fee).`,
      },
      {
        audience: 'founder',
        tone: 'info',
        title: 'Owner withdrawal request',
        body: `${owner.name}: ${formatINR(net)} (${method}).`,
      },
    ])

    res.status(201).json({ withdrawal: withdrawal.toPublic(), balance: balanceAfter })
  }),
)

export default router
