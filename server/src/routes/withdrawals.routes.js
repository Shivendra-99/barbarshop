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
export const FEE_RATES = { instant: 0.07, weekly: 0.04 }
const pct = (method) => `${Math.round(FEE_RATES[method] * 100)}%`

const createSchema = z.object({
  amount: z.number().int().min(1),
  method: z.enum(['instant', 'weekly']),
})

const blank = (v) => (typeof v === 'string' && v.trim() === '' ? null : v)
const detailsSchema = z
  .object({
    upi: z.preprocess(
      blank,
      z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{2,256}@[a-z]{2,64}$/, 'Enter a valid UPI ID, e.g. name@okaxis').nullable().default(null),
    ),
    accountName: z.preprocess(blank, z.string().trim().min(2).max(100).nullable().default(null)),
    accountNumber: z.preprocess(blank, z.string().trim().regex(/^\d{9,18}$/, 'Account number is 9–18 digits').nullable().default(null)),
    ifsc: z.preprocess(
      blank,
      z.string().trim().toUpperCase().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Enter a valid IFSC, e.g. SBIN0001234').nullable().default(null),
    ),
  })
  .refine((d) => d.upi || (d.accountName && d.accountNumber && d.ifsc), {
    message: 'Add a UPI ID, or all three bank details.',
  })
  .refine((d) => !(d.accountName || d.accountNumber || d.ifsc) || (d.accountName && d.accountNumber && d.ifsc), {
    message: 'Fill in name, account number and IFSC together.',
  })

const hasPayout = (p) => Boolean(p?.upi || (p?.accountName && p?.accountNumber && p?.ifsc))
const payoutOf = (u) => ({
  upi: u.payout?.upi ?? null,
  accountName: u.payout?.accountName ?? null,
  accountNumber: u.payout?.accountNumber ?? null,
  ifsc: u.payout?.ifsc ?? null,
})

/** Owner: withdrawal history, payout details and the rules. */
router.get(
  '/',
  requireAuth,
  requireRole('owner'),
  asyncHandler(async (req, res) => {
    const withdrawals = await Withdrawal.find({ owner: req.user._id }).sort({ createdAt: -1 })
    res.json({
      balance: req.user.walletBalance,
      min: MIN_WITHDRAWAL,
      feeRates: FEE_RATES,
      payout: payoutOf(req.user),
      withdrawals: withdrawals.map((w) => w.toPublic()),
    })
  }),
)

/** Owner: save where withdrawals are paid. */
router.put(
  '/payout-details',
  requireAuth,
  requireRole('owner'),
  validate(detailsSchema),
  asyncHandler(async (req, res) => {
    const payout = { ...req.body }
    await User.updateOne({ _id: req.user._id }, { payout })
    res.json({ payout })
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
    if (!hasPayout(req.user.payout)) {
      throw new ApiError(400, 'Add your UPI ID or bank account before withdrawing.')
    }

    // Atomic debit: the balance check and the debit are one operation, so two
    // requests at once can't both spend the same money.
    const owner = await User.findOneAndUpdate(
      { _id: req.user._id, walletBalance: { $gte: amount } },
      { $inc: { walletBalance: -amount } },
      { new: true },
    )
    if (!owner) throw new ApiError(400, 'Amount is more than your wallet balance.')

    const fee = Math.round(amount * FEE_RATES[method])
    const net = amount - fee

    await WalletTxn.create({
      user: owner._id,
      type: 'debit',
      amount,
      note: `${method === 'instant' ? 'Instant' : 'Weekly'} withdrawal (${pct(method)} fee ${formatINR(fee)})`,
      balanceAfter: owner.walletBalance,
    })

    const withdrawal = await Withdrawal.create({
      owner: owner._id,
      amount,
      fee,
      net,
      method,
      destination: payoutOf(owner),
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
            ? `${formatINR(net)} on its way (${pct(method)} fee ${formatINR(fee)}).`
            : `${formatINR(net)} will be settled this Sunday (${pct(method)} fee ${formatINR(fee)}).`,
      },
      {
        audience: 'founder',
        tone: 'info',
        title: 'Owner withdrawal request',
        body: `${owner.name}: ${formatINR(net)} (${method}).`,
      },
    ])

    res.status(201).json({ withdrawal: withdrawal.toPublic(), balance: owner.walletBalance })
  }),
)

/* ------------------------------ Founder ------------------------------ */

/** Founder: every withdrawal, open ones first, with the owner's name and phone. */
router.get(
  '/all',
  requireAuth,
  requireRole('founder'),
  asyncHandler(async (_req, res) => {
    const rows = await Withdrawal.find().sort({ createdAt: -1 }).limit(500).populate('owner', 'name phone')
    const open = (w) => (w.status === 'pending' || w.status === 'processing' ? 0 : 1)
    rows.sort((a, b) => open(a) - open(b)) // stable: newest first within each group
    res.json({
      withdrawals: rows.map((w) => ({
        ...w.toPublic(),
        owner: w.owner ? { id: w.owner._id.toString(), name: w.owner.name, phone: w.owner.phone } : null,
      })),
    })
  }),
)

const decideSchema = z.object({
  status: z.enum(['completed', 'rejected']),
  utr: z.string().trim().max(64).optional(),
  note: z.string().trim().max(300).optional(),
})

/**
 * Founder: mark a withdrawal paid (after transferring `net`) or rejected.
 * Rejecting credits the gross amount back to the owner's wallet.
 */
router.patch(
  '/:id',
  requireAuth,
  requireRole('founder'),
  validate(decideSchema),
  asyncHandler(async (req, res) => {
    const { status, utr, note } = req.body
    // Atomic claim on an open withdrawal: a double-click can't refund twice.
    const w = await Withdrawal.findOneAndUpdate(
      { _id: req.params.id, status: { $in: ['pending', 'processing'] } },
      { status, utr: utr || null, note: note || null, processedAt: new Date() },
      { new: true },
    ).catch(() => null)
    if (!w) throw new ApiError(404, 'Withdrawal not found or already settled.')

    if (status === 'rejected') {
      const owner = await User.findByIdAndUpdate(w.owner, { $inc: { walletBalance: w.amount } }, { new: true })
      await WalletTxn.create({
        user: w.owner,
        type: 'credit',
        amount: w.amount,
        note: `Withdrawal returned${note ? ` — ${note}` : ''}`,
        balanceAfter: owner?.walletBalance ?? 0,
      })
    }

    await notify([
      {
        audience: `owner:${w.owner.toString()}`,
        tone: status === 'completed' ? 'success' : 'warn',
        title: status === 'completed' ? 'Withdrawal paid' : 'Withdrawal returned to wallet',
        body:
          status === 'completed'
            ? `${formatINR(w.net)} has been sent${utr ? ` (ref ${utr})` : ''}.`
            : `${formatINR(w.amount)} is back in your wallet${note ? `: ${note}` : '.'}`,
      },
    ])

    res.json({ withdrawal: w.toPublic() })
  }),
)

export default router
