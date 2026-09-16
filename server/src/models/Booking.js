import mongoose from 'mongoose'

const bookingSchema = new mongoose.Schema(
  {
    ref: { type: String, required: true, unique: true, index: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    salon: { type: mongoose.Schema.Types.ObjectId, ref: 'Salon', required: true, index: true },
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },

    // Denormalised labels so history reads correctly even if the salon later changes.
    salonName: String,
    serviceName: String, // combined label, e.g. "Haircut + Beard trim"
    // Snapshot of each booked service (cart). Single-service bookings have one.
    items: {
      type: [{ name: String, amount: Number, mins: Number }],
      default: [],
    },
    staffName: { type: String, default: null },
    // Snapshot of the salon's contact number at booking time, so "Call Salon"
    // works in My Bookings without a separate salon lookup.
    salonPhone: { type: String, default: null },

    mode: { type: String, enum: ['salon', 'home'], required: true },
    modeLabel: String,
    address: { type: String, default: null }, // captured for home service
    // Mappls geo reference for the home-service address.
    location: {
      eLoc: { type: String, default: null },
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },

    date: { type: String, required: true }, // ISO yyyy-mm-dd
    dateLabel: String,
    slot: { type: String, required: true },
    // Which parallel "chair" (0 … capacity-1) this booking holds in its slot.
    // Combined with the partial unique index below, this makes double-booking
    // impossible at the database level (not just a check-then-insert).
    seat: { type: Number, default: 0 },

    paymentMode: { type: String, enum: ['online', 'offline'], required: true },
    // online = paid via app upfront; offline = cash, 'pending' until the owner
    // marks "Payment Complete" after the service.
    paymentStatus: { type: String, enum: ['pending', 'paid'], default: 'pending' },
    paidAt: { type: Date, default: null },
    // Razorpay references for an online payment (null for cash / demo).
    razorpay: {
      orderId: { type: String, default: null },
      paymentId: { type: String, default: null },
    },

    // Pricing snapshot (server-computed; the client never sets these).
    base: Number,
    discount: Number,
    discountEligible: Boolean,
    total: Number,
    commission: Number,
    salonPayout: Number,
    payee: String,
    dueAtSalon: Number,
    homeServiceFee: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ['confirmed', 'cancelled', 'completed'],
      default: 'confirmed',
      index: true,
    },
    // 4-digit code the customer gives the salon to complete the service. The
    // owner must enter it to mark the booking COMPLETED (proof of service).
    completionOtp: { type: String, default: null },
    completionOtpVerified: { type: Boolean, default: false },
    // True when the salon cancelled this as a customer no-show, plus the reason
    // the owner picked (one of a few preset reasons — no free typing).
    noShow: { type: Boolean, default: false },
    noShowReason: { type: String, default: null },
    refund: {
      amount: Number,
      fee: Number,
      feePct: Number,
      method: String,
      status: String,
    },
    // Customer's rating of the salon for this booking (1–5) + optional review.
    rating: { type: Number, min: 1, max: 5, default: null },
    review: { type: String, default: '' },
    cancelledAt: Date,
  },
  { timestamps: true },
)

// One confirmed booking per (salon, date, slot, seat). Cancelled/completed
// bookings are excluded, so their seats free up for reuse. This is the hard
// guarantee behind capacity — a race that slips past the app-level check still
// hits a duplicate-key error and is retried onto the next free seat.
bookingSchema.index(
  { salon: 1, date: 1, slot: 1, seat: 1 },
  { unique: true, partialFilterExpression: { status: 'confirmed' } },
)

// `includeOtp` is set only for the customer's own views — never owner/founder,
// so the completion OTP stays secret from the salon until the customer shares it.
// `includeCustomer` adds the customer's name+phone for the owner's booking list
// (revealed behind a "Click to view number" tap in the UI).
bookingSchema.methods.toPublic = function toPublic({
  includeOtp = false,
  includeCustomer = false,
} = {}) {
  // customer may be a populated User doc (owner views) or a plain id.
  const cust = this.customer && this.customer.name ? this.customer : null
  return {
    id: this._id.toString(),
    completionOtp: includeOtp ? this.completionOtp ?? null : undefined,
    completionOtpVerified: this.completionOtpVerified ?? false,
    ref: this.ref,
    customerId: cust ? cust._id.toString() : this.customer?.toString?.() ?? this.customer,
    customerName: includeCustomer ? cust?.name ?? null : undefined,
    customerPhone: includeCustomer ? cust?.phone ?? null : undefined,
    salonId: this.salon?.toString?.() ?? this.salon,
    serviceId: this.service?.toString?.() ?? this.service,
    salonName: this.salonName,
    serviceName: this.serviceName,
    items: (this.items ?? []).map((i) => ({ name: i.name, amount: i.amount, mins: i.mins })),
    staffName: this.staffName,
    salonPhone: this.salonPhone ?? null,
    mode: this.mode,
    modeLabel: this.modeLabel,
    address: this.address,
    location: this.location ?? { eLoc: null, lat: null, lng: null },
    date: this.date,
    dateLabel: this.dateLabel,
    slot: this.slot,
    paymentMode: this.paymentMode,
    paymentStatus: this.paymentStatus,
    paidAt: this.paidAt,
    razorpay: this.razorpay ?? { orderId: null, paymentId: null },
    base: this.base,
    discount: this.discount,
    discountEligible: this.discountEligible,
    total: this.total,
    commission: this.commission,
    salonPayout: this.salonPayout,
    payee: this.payee,
    dueAtSalon: this.dueAtSalon,
    homeServiceFee: this.homeServiceFee,
    status: this.status,
    noShow: this.noShow ?? false,
    noShowReason: this.noShowReason ?? null,
    refund: this.refund,
    rating: this.rating,
    review: this.review,
    createdAt: this.createdAt,
  }
}

export const Booking = mongoose.model('Booking', bookingSchema)
