import mongoose from 'mongoose'

/**
 * A payout of an owner's wallet earnings.
 *   • instant → 7% fee, requested by the owner, processed on request.
 *   • weekly  → 4% fee, created automatically every Sunday 9 PM for the whole
 *     balance (see lib/weeklyPayouts.js); the founder pays it by Monday 9 AM.
 * The wallet is debited (gross) when the request is made; the founder marks it
 * completed once `net` is transferred to `destination`, or rejects it (which
 * credits the gross back to the wallet).
 */
const withdrawalSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true }, // gross debited from wallet
    fee: { type: Number, default: 0 },
    net: { type: Number, required: true }, // paid out to the owner
    method: { type: String, enum: ['instant', 'weekly'], required: true },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'rejected'],
      default: 'pending',
      index: true,
    },
    // Snapshot of the owner's payout details at request time, so editing them
    // later can't change where an already-requested withdrawal goes.
    destination: {
      upi: { type: String, default: null },
      accountName: { type: String, default: null },
      accountNumber: { type: String, default: null },
      ifsc: { type: String, default: null },
    },
    utr: { type: String, default: null }, // bank/UPI reference, set when paid
    note: { type: String, default: null }, // reason, set when rejected
    processedAt: { type: Date, default: null },
    // Weekly auto payouts: the IST date of the run (one per owner per run) and
    // the deadline the founder should pay by (Monday 9 AM IST).
    week: { type: String, default: null },
    dueBy: { type: Date, default: null },
  },
  { timestamps: true },
)

// A retried or double-fired cron can't create two weekly payouts for one owner.
withdrawalSchema.index(
  { owner: 1, week: 1 },
  { unique: true, partialFilterExpression: { week: { $type: 'string' } } },
)

withdrawalSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id.toString(),
    amount: this.amount,
    fee: this.fee,
    net: this.net,
    method: this.method,
    status: this.status,
    destination: this.destination,
    utr: this.utr,
    note: this.note,
    processedAt: this.processedAt,
    dueBy: this.dueBy,
    ts: this.createdAt,
  }
}

export const Withdrawal = mongoose.model('Withdrawal', withdrawalSchema)
