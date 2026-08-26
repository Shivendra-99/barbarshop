import mongoose from 'mongoose'

/**
 * One booking event fans out into several notifications, each addressed to an
 * `audience` string: `user:<id>`, `owner:<id>`, or `founder`. A reader fetches
 * the notifications whose audience matches their role/identity.
 */
const notificationSchema = new mongoose.Schema(
  {
    audience: { type: String, required: true, index: true },
    tone: { type: String, enum: ['info', 'success', 'warn'], default: 'info' },
    title: { type: String, required: true },
    body: { type: String, default: '' },
    read: { type: Boolean, default: false },
  },
  { timestamps: true },
)

notificationSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id.toString(),
    audience: this.audience,
    tone: this.tone,
    title: this.title,
    body: this.body,
    read: this.read,
    ts: this.createdAt,
  }
}

export const Notification = mongoose.model('Notification', notificationSchema)
