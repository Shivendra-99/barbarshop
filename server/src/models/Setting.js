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
  },
  { timestamps: true },
)

export const Setting = mongoose.model('Setting', settingSchema)
