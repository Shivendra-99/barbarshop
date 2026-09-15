import mongoose from 'mongoose'

/**
 * A salon owner's request to withdraw wallet earnings.
 *   • instant → 7% fee, processed on request.
 *   • weekly  → 0% fee, settled by the SalonSaathi team every Sunday.
 * The wallet is debited (gross) when the request is made; the team marks it
 * completed once the bank transfer of `net` is done.
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
  },
  { timestamps: true },
)

withdrawalSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id.toString(),
    amount: this.amount,
    fee: this.fee,
    net: this.net,
    method: this.method,
    status: this.status,
    ts: this.createdAt,
  }
}

export const Withdrawal = mongoose.model('Withdrawal', withdrawalSchema)
