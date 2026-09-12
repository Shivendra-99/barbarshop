import mongoose from 'mongoose'

/**
 * A short-lived record of a Razorpay order awaiting payment. We create it when
 * the browser asks for an order and hold the *server-validated* booking draft +
 * amount here — so on verify we build the booking from trusted data, never from
 * whatever the client posts back. Abandoned intents self-expire (TTL below), so
 * only paid ones ever become bookings.
 */
const paymentIntentSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // The validated booking draft to persist once payment is verified.
    draft: { type: mongoose.Schema.Types.Mixed, required: true },
    amount: { type: Number, required: true }, // paise
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: ['created', 'paid', 'failed'], default: 'created' },
    bookingRef: { type: String, default: null },
    // TTL: an unpaid intent is cleaned up after 30 minutes.
    createdAt: { type: Date, default: Date.now, expires: 60 * 30 },
  },
  { timestamps: false },
)

export const PaymentIntent = mongoose.model('PaymentIntent', paymentIntentSchema)
