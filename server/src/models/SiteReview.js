import mongoose from 'mongoose'

/** A user's rating of SalonSaathi itself (not a salon). One per user; editable. */
const siteReviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    name: { type: String, default: '' }, // snapshot for display
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '', maxlength: 500 },
  },
  { timestamps: true },
)

siteReviewSchema.methods.toPublic = function toPublic() {
  return {
    // First name only on public pages.
    name: (this.name || 'SalonSaathi user').split(' ')[0],
    rating: this.rating,
    comment: this.comment,
    ts: this.updatedAt,
  }
}

export const SiteReview = mongoose.model('SiteReview', siteReviewSchema)
