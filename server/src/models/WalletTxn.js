import mongoose from 'mongoose'

/** A single wallet movement — the running balance lives on User.walletBalance. */
const walletTxnSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['credit', 'debit'], required: true },
    amount: { type: Number, required: true },
    note: { type: String, default: '' },
    bookingRef: { type: String, default: null },
    balanceAfter: { type: Number, required: true },
  },
  { timestamps: true },
)

walletTxnSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id.toString(),
    type: this.type,
    amount: this.amount,
    note: this.note,
    bookingRef: this.bookingRef,
    balanceAfter: this.balanceAfter,
    ts: this.createdAt,
  }
}

export const WalletTxn = mongoose.model('WalletTxn', walletTxnSchema)
