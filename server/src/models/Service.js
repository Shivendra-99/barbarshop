import mongoose from 'mongoose'

/**
 * A service is owned by one salon — the owner sets its name, price and duration.
 * `code` is kept for the seeded starter services (provenance only) and is no
 * longer unique, since many salons can offer a "Haircut".
 */
const serviceSchema = new mongoose.Schema(
  {
    salon: { type: mongoose.Schema.Types.ObjectId, ref: 'Salon', required: true, index: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    category: { type: String, required: true }, // inherited from the salon
    code: { type: String, default: null },
    name: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 }, // rupees
    mins: { type: Number, required: true, min: 5 },
    desc: { type: String, default: '' },
  },
  { timestamps: true },
)

serviceSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id.toString(),
    salonId: this.salon?.toString?.() ?? this.salon,
    category: this.category,
    name: this.name,
    amount: this.amount,
    mins: this.mins,
    desc: this.desc,
  }
}

export const Service = mongoose.model('Service', serviceSchema)
