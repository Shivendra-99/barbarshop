import mongoose from 'mongoose'

const salonSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, index: true }, // mens | unisex | parlour
    city: { type: String, required: true, index: true },
    state: { type: String, default: '' },
    district: { type: String, default: '' },
    pin: { type: String, default: '' },
    area: { type: String, required: true },
    address: { type: String, required: true },
    // Mappls geo reference for the address: compact eLoc always; lat/lng when
    // the geocoder can resolve them.
    location: {
      eLoc: { type: String, default: null },
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    serviceModes: { type: [String], default: ['salon'] }, // 'salon' | 'home'
    homeServiceFee: { type: Number, default: 0 },

    // Owner-uploaded cover photo, stored as a compressed data URL (resized on
    // the client to keep it small). Null = fall back to the stock category image.
    photo: { type: String, default: null },

    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },

    opens: { type: String, default: '10:00' },
    closes: { type: String, default: '20:00' },
    // Slot geometry the owner controls: interval length in minutes, weekly days
    // off (0=Sun … 6=Sat) and one-off blocked dates (ISO yyyy-mm-dd holidays).
    slotMinutes: { type: Number, default: 30 },
    daysOff: { type: [Number], default: [] },
    closedDates: { type: [String], default: [] },
    // Parallel bookings a single time slot can hold (chairs / staff working at
    // once). Availability blocks a slot once its confirmed bookings hit this.
    capacity: { type: Number, default: 1, min: 1 },
    rating: { type: Number, default: 0 },
    reviews: { type: Number, default: 0 },
    badge: { type: String, default: 'New' },
    dist: { type: String, default: '—' },
  },
  { timestamps: true },
)

salonSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id.toString(),
    name: this.name,
    category: this.category,
    city: this.city,
    state: this.state,
    district: this.district,
    pin: this.pin,
    area: this.area,
    address: this.address,
    location: this.location ?? { eLoc: null, lat: null, lng: null },
    ownerId: this.owner?.toString?.() ?? this.owner,
    serviceModes: this.serviceModes,
    homeServiceFee: this.homeServiceFee,
    photo: this.photo ?? null,
    status: this.status,
    opens: this.opens,
    closes: this.closes,
    slotMinutes: this.slotMinutes ?? 30,
    daysOff: this.daysOff ?? [],
    closedDates: this.closedDates ?? [],
    capacity: this.capacity ?? 1,
    rating: this.rating,
    reviews: this.reviews,
    badge: this.badge,
    dist: this.dist,
  }
}

export const Salon = mongoose.model('Salon', salonSchema)
