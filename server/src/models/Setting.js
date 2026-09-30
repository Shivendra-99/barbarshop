import mongoose from 'mongoose'

/** Global platform settings — a single document keyed 'global'. */
const settingSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: 'global' },
    // "Coming soon in this area" banner for cities with no live salons.
    comingSoonEnabled: { type: Boolean, default: true },
    comingSoonMessage: {
      type: String,
      default: 'Coming soon to your area — we’re onboarding great salons near you.',
    },
    // First-booking discount (online, never booked before). 0 turns it off.
    firstBookingPercent: { type: Number, default: 10, min: 0, max: 50 },
  },
  { timestamps: true },
)

/** The singleton settings doc, created with defaults on first use. */
settingSchema.statics.global = function global() {
  return this.findOneAndUpdate({ key: 'global' }, { $setOnInsert: { key: 'global' } }, { upsert: true, new: true })
}

export const Setting = mongoose.model('Setting', settingSchema)
