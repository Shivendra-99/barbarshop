import { Router } from 'express'
import { WalletTxn } from '../models/WalletTxn.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/error.js'

const router = Router()

/** Wallet balance + ledger for the signed-in customer or owner. */
router.get(
  '/',
  requireAuth,
  requireRole('customer', 'owner'),
  asyncHandler(async (req, res) => {
    const ledger = await WalletTxn.find({ user: req.user._id }).sort({ createdAt: -1 })
    res.json({
      balance: req.user.walletBalance,
      ledger: ledger.map((t) => t.toPublic()),
    })
  }),
)

export default router
