import { imageFor, STAFF_IMAGES } from '../assets'

/* ------------------------------------------------------------------
   Salon categories — the three "Choose Your Salon" options.
   ------------------------------------------------------------------ */

export const CATEGORIES = [
  {
    id: 'mens',
    label: "Men's Salon",
    blurb: 'Grooming, haircuts, beard styling & facials for men',
    short: 'Haircut · Beard · Styling',
  },
  {
    id: 'unisex',
    label: 'Unisex Salon',
    blurb: 'Hair, skin & beauty services for everyone',
    short: 'Hair · Skin · Nails',
  },
  {
    id: 'parlour',
    label: 'Beauty Parlour',
    blurb: 'Facials, waxing, manicure, pedicure, skincare & bridal makeup',
    short: 'Facials · Makeup · Spa',
  },
]

export const categoryById = (id) => CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0]

/* ------------------------------------------------------------------
   Cities
   ------------------------------------------------------------------ */

export const CITIES = [
  { id: 'lucknow', label: 'Lucknow', areas: 'Gomti Nagar · Hazratganj · Aliganj', pin: '226030' },
  { id: 'mumbai', label: 'Mumbai', areas: 'Bandra · Lower Parel · Andheri', pin: '400050' },
  { id: 'delhi', label: 'Delhi NCR', areas: 'Khan Market · CP · Hauz Khas', pin: '110003' },
]

export const cityById = (id) => CITIES.find((c) => c.id === id) ?? CITIES[0]

/* ------------------------------------------------------------------
   Service menus, per category
   ------------------------------------------------------------------ */

export const SERVICES_BY_CATEGORY = {
  mens: [
    { id: 'm-haircut', name: 'Haircut & Styling', amount: 250, mins: 30, desc: 'Consultation, wash, cut and a finish with product that suits your hair.' },
    { id: 'm-beard', name: 'Beard Trim & Shape', amount: 180, mins: 20, desc: 'Shape, trim and razor detail followed by hot towel and balm.' },
    { id: 'm-shave', name: 'Classic Razor Shave', amount: 300, mins: 30, desc: 'Traditional wet shave with pre-shave oil, two passes and a cold towel.' },
    { id: 'm-colour', name: 'Hair Colour', amount: 700, mins: 60, desc: 'Ammonia-free colour with grey coverage and a conditioning finish.' },
    { id: 'm-massage', name: 'Head Massage', amount: 350, mins: 30, desc: 'Warm oil champi to relieve tension, finished with a steam towel.' },
    { id: 'm-groom', name: 'Full Grooming Package', amount: 1200, mins: 90, desc: 'Haircut, beard sculpt, shave, face cleanup and head massage.' },
  ],
  unisex: [
    { id: 'u-haircut', name: 'Haircut & Blow Dry', amount: 450, mins: 45, desc: 'Consultation, wash, precision cut and a blow-dry finish.' },
    { id: 'u-spa', name: 'Hair Spa Treatment', amount: 900, mins: 60, desc: 'Deep-conditioning masque, scalp massage and steam.' },
    { id: 'u-colour', name: 'Global Hair Colour', amount: 2500, mins: 120, desc: 'Full-head colour with bond protection and a gloss finish.' },
    { id: 'u-keratin', name: 'Keratin Smoothening', amount: 3500, mins: 180, desc: 'Frizz control and shine, lasting up to four months.' },
    { id: 'u-mani', name: 'Manicure', amount: 500, mins: 40, desc: 'Shape, cuticle care, exfoliation, massage and polish.' },
    { id: 'u-pedi', name: 'Pedicure', amount: 700, mins: 50, desc: 'Soak, scrub, callus care, massage and polish.' },
  ],
  parlour: [
    { id: 'p-threading', name: 'Eyebrow Threading', amount: 80, mins: 15, desc: 'Precise shaping to suit your face, finished with soothing gel.' },
    { id: 'p-cleanup', name: 'Face Cleanup', amount: 600, mins: 40, desc: 'Cleanse, exfoliate, steam, extraction and a calming pack.' },
    { id: 'p-facial', name: 'Gold Radiance Facial', amount: 1500, mins: 60, desc: '24k gold facial for glow and even tone, with a lifting massage.' },
    { id: 'p-wax', name: 'Full Body Waxing', amount: 1800, mins: 75, desc: 'Rica wax, low-pain technique, with post-wax soothing lotion.' },
    { id: 'p-pedi', name: 'Spa Pedicure', amount: 700, mins: 50, desc: 'Aroma soak, scrub, mask, extended massage and polish.' },
    { id: 'p-bridal', name: 'Bridal Makeup', amount: 8000, mins: 150, desc: 'HD airbrush makeup, hairstyling, draping and touch-up kit.' },
  ],
}

export const servicesFor = (category) => SERVICES_BY_CATEGORY[category] ?? SERVICES_BY_CATEGORY.unisex

export const findService = (serviceId) =>
  Object.values(SERVICES_BY_CATEGORY)
    .flat()
    .find((s) => s.id === serviceId) ?? null

/* ------------------------------------------------------------------
   Owners & founder
   ------------------------------------------------------------------ */

export const FOUNDER = { id: 'founder', name: 'Founder', phone: '9000000000', role: 'founder' }

export const OWNERS = [
  { id: 'own-1', name: 'Rakesh Verma', phone: '9811100001', role: 'owner' },
  { id: 'own-2', name: 'Sneha Kapoor', phone: '9811100002', role: 'owner' },
  { id: 'own-3', name: 'Imran Sheikh', phone: '9811100003', role: 'owner' },
  { id: 'own-4', name: 'Divya Raghav', phone: '9811100004', role: 'owner' },
]

/* ------------------------------------------------------------------
   Salons

   `status` drives the founder approval queue: only `approved` salons are
   publicly listable. `serviceModes` is the owner's call per rule 1 —
   some salons offer home service, some don't.
   ------------------------------------------------------------------ */

const rawSalons = [
  // ---- Lucknow ----
  {
    id: 'the-gilded-chair', name: 'The Gilded Chair', category: 'mens', city: 'lucknow',
    area: 'Gomti Nagar', address: 'Vibhuti Khand, Gomti Nagar', dist: '1.2 km',
    rating: 4.9, reviews: 312, badge: "Editor's pick", ownerId: 'own-1',
    serviceModes: ['salon', 'home'], homeServiceFee: 150, status: 'approved',
    opens: '09:00', closes: '21:00',
  },
  {
    id: 'ivory-lounge', name: 'Ivory Lounge', category: 'unisex', city: 'lucknow',
    area: 'Hazratganj', address: 'Mall Avenue, Hazratganj', dist: '2.4 km',
    rating: 4.8, reviews: 428, badge: 'Popular', ownerId: 'own-2',
    serviceModes: ['salon', 'home'], homeServiceFee: 200, status: 'approved',
    opens: '10:00', closes: '20:30',
  },
  {
    id: 'blush-beauty-bar', name: 'Blush Beauty Bar', category: 'parlour', city: 'lucknow',
    area: 'Aliganj', address: 'Kapoorthala, Aliganj', dist: '3.1 km',
    rating: 4.9, reviews: 265, badge: 'Premium', ownerId: 'own-2',
    serviceModes: ['salon', 'home'], homeServiceFee: 250, status: 'approved',
    opens: '10:00', closes: '20:00',
  },
  {
    id: 'sharp-co', name: 'Sharp & Co.', category: 'mens', city: 'lucknow',
    area: 'Indira Nagar', address: 'Sector 14, Indira Nagar', dist: '4.0 km',
    rating: 4.7, reviews: 186, badge: 'New', ownerId: 'own-3',
    serviceModes: ['salon'], homeServiceFee: 0, status: 'approved',
    opens: '09:30', closes: '21:00',
  },
  {
    id: 'lumiere-studio', name: 'Lumière Studio', category: 'unisex', city: 'lucknow',
    area: 'Lulu Mall', address: 'Lulu Mall, Sushant Golf City', dist: '5.6 km',
    rating: 4.8, reviews: 501, badge: 'Trending', ownerId: 'own-4',
    serviceModes: ['salon'], homeServiceFee: 0, status: 'approved',
    opens: '11:00', closes: '22:00',
  },
  {
    id: 'glow-room', name: 'The Glow Room', category: 'parlour', city: 'lucknow',
    area: 'Gomti Nagar', address: 'Viraj Khand, Gomti Nagar', dist: '1.8 km',
    rating: 4.6, reviews: 143, badge: 'New', ownerId: 'own-4',
    serviceModes: ['home'], homeServiceFee: 0, status: 'pending',
    opens: '10:00', closes: '19:00',
  },
  // ---- Mumbai ----
  {
    id: 'rue-noir', name: 'Rue Noir', category: 'mens', city: 'mumbai',
    area: 'Bandra West', address: 'Hill Road, Bandra West', dist: '0.8 km',
    rating: 4.9, reviews: 487, badge: 'Premium', ownerId: 'own-1',
    serviceModes: ['salon', 'home'], homeServiceFee: 300, status: 'approved',
    opens: '10:00', closes: '21:00',
  },
  {
    id: 'maison-belle', name: 'Maison Belle', category: 'unisex', city: 'mumbai',
    area: 'Lower Parel', address: 'Kamala Mills, Lower Parel', dist: '2.2 km',
    rating: 4.8, reviews: 372, badge: 'Popular', ownerId: 'own-2',
    serviceModes: ['salon'], homeServiceFee: 0, status: 'approved',
    opens: '10:00', closes: '20:00',
  },
  {
    id: 'velvet-mane', name: 'Velvet Mane', category: 'parlour', city: 'mumbai',
    area: 'Andheri West', address: 'Lokhandwala, Andheri West', dist: '3.4 km',
    rating: 4.7, reviews: 219, badge: 'Trending', ownerId: 'own-3',
    serviceModes: ['salon', 'home'], homeServiceFee: 350, status: 'approved',
    opens: '10:30', closes: '20:30',
  },
  // ---- Delhi NCR ----
  {
    id: 'atelier-bertrand', name: 'Atelier Bertrand', category: 'mens', city: 'delhi',
    area: 'Khan Market', address: 'Khan Market, New Delhi', dist: '1.1 km',
    rating: 5.0, reviews: 221, badge: 'Luxury', ownerId: 'own-1',
    serviceModes: ['salon'], homeServiceFee: 0, status: 'approved',
    opens: '10:00', closes: '20:00',
  },
  {
    id: 'oriental-bloom', name: 'Oriental Bloom', category: 'unisex', city: 'delhi',
    area: 'Hauz Khas', address: 'Hauz Khas Village, New Delhi', dist: '2.9 km',
    rating: 4.8, reviews: 340, badge: 'Popular', ownerId: 'own-4',
    serviceModes: ['salon', 'home'], homeServiceFee: 250, status: 'approved',
    opens: '10:00', closes: '21:00',
  },
  {
    id: 'saanjh-parlour', name: 'Saanjh Beauty Parlour', category: 'parlour', city: 'delhi',
    area: 'Connaught Place', address: 'Inner Circle, Connaught Place', dist: '1.6 km',
    rating: 4.9, reviews: 288, badge: "Editor's pick", ownerId: 'own-3',
    serviceModes: ['salon', 'home'], homeServiceFee: 300, status: 'approved',
    opens: '10:00', closes: '20:00',
  },
]

const STAFF_NAMES = {
  mens: [
    { name: 'Arjun Salgaonkar', role: 'Master barber', years: '12 yrs', rating: 5.0 },
    { name: 'Rehan Qureshi', role: 'Senior stylist', years: '8 yrs', rating: 4.9 },
    { name: 'Vikram Nair', role: 'Stylist', years: '5 yrs', rating: 4.8 },
  ],
  unisex: [
    { name: 'Neha Bajaj', role: 'Creative director', years: '11 yrs', rating: 4.9 },
    { name: 'Aditi Rao', role: 'Senior stylist', years: '7 yrs', rating: 4.9 },
    { name: 'Karan Mehta', role: 'Colour specialist', years: '6 yrs', rating: 4.8 },
  ],
  parlour: [
    { name: 'Priya Nandan', role: 'Lead beautician', years: '10 yrs', rating: 5.0 },
    { name: 'Fatima Ansari', role: 'Skin therapist', years: '7 yrs', rating: 4.9 },
    { name: 'Ritu Sharma', role: 'Makeup artist', years: '9 yrs', rating: 4.9 },
  ],
}

export const SALONS = rawSalons.map((s, i) => ({
  ...s,
  img: imageFor(s.category, i),
  services: servicesFor(s.category).map((x) => x.id),
  from: Math.min(...servicesFor(s.category).map((x) => x.amount)),
  staff: STAFF_NAMES[s.category].map((p, k) => ({
    ...p,
    id: `${s.id}-staff-${k}`,
    img: STAFF_IMAGES[(i + k) % STAFF_IMAGES.length],
  })),
}))

export const salonById = (id) => SALONS.find((s) => s.id === id) ?? null

/* ------------------------------------------------------------------
   Marketing copy
   ------------------------------------------------------------------ */

export const BRAND = {
  name: 'SalonSathi',
  tagline: 'Book Your Appointment, Skip The Wait',
}

export const TRUST_POINTS = [
  'Certified professionals',
  'Premium products',
  'Luxury experience',
]

export const STEPS = [
  { n: '01', title: 'Choose your salon', body: 'Pick a men’s salon, unisex salon or beauty parlour near you.' },
  { n: '02', title: 'Pick service & slot', body: 'At the salon or at your home — whichever the salon offers.' },
  { n: '03', title: 'Confirm with OTP', body: 'One code and your slot is held. No calls, no waiting.' },
]

export const FAQS = [
  {
    q: 'Do I pay online or at the salon?',
    a: 'Both work. Pay online and get 10% off your very first booking, or choose to pay cash at the salon — the booking is confirmed either way.',
  },
  {
    q: 'Is the 10% discount available every time?',
    a: 'No. It applies once, on your first ever booking, and only when you pay online. From your second booking onwards the full amount applies.',
  },
  {
    q: 'Can I get the service at home?',
    a: 'Wherever the salon offers it. Each salon decides whether it does home service, and you will see a Home service option on its page when available.',
  },
  {
    q: 'How do refunds work if I cancel?',
    a: 'Choose SalonSathi Wallet for an instant credit, or send it back to your UPI or bank account, which takes 2–3 working days. Cash bookings have nothing to refund.',
  },
  {
    q: 'How do I list my salon?',
    a: 'Register as a salon owner and submit your salon. Our team reviews and approves it, usually within a day, and then it goes live.',
  },
]

export const TESTIMONIALS = [
  { quote: 'Booked a haircut on the way home and walked straight into the chair. No waiting at all.', name: 'Aditya Bhatnagar', meta: 'Lucknow · 31 bookings' },
  { quote: 'Home service for my mother’s facial was seamless. The beautician arrived exactly on time.', name: 'Shreya Mishra', meta: 'Lucknow · 12 bookings' },
  { quote: 'Cancelled once and the refund hit my wallet instantly. Used it the same week.', name: 'Karan Oberoi', meta: 'Delhi NCR · 26 bookings' },
]
