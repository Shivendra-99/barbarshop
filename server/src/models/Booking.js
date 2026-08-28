import mongoose from 'mongoose'

const bookingSchema = new mongoose.Schema(
  {
    ref: { type: String, required: true, unique: true, index: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    salon: { type: mongoose.Schema.Types.ObjectId, ref: 'Salon', required: true, index: true },
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },

    // Denormalised labels so history reads correctly even if the salon later changes.
    salonName: String,
    serviceName: String,
    staffName: { type: String, default: null },

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

    paymentMode: { type: String, enum: ['online', 'offline'], required: true },

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
    refund: {
      amount: Number,
      method: String,
      status: String,
    },
    cancelledAt: Date,
  },
  { timestamps: true },
)

bookingSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id.toString(),
    ref: this.ref,
    customerId: this.customer?.toString?.() ?? this.customer,
    salonId: this.salon?.toString?.() ?? this.salon,
    serviceId: this.service?.toString?.() ?? this.service,
    salonName: this.salonName,
    serviceName: this.serviceName,
    staffName: this.staffName,
    mode: this.mode,
    modeLabel: this.modeLabel,
    address: this.address,
    location: this.location ?? { eLoc: null, lat: null, lng: null },
    date: this.date,
    dateLabel: this.dateLabel,
    slot: this.slot,
    paymentMode: this.paymentMode,
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
    refund: this.refund,
    createdAt: this.createdAt,
  }
}

export const Booking = mongoose.model('Booking', bookingSchema)
