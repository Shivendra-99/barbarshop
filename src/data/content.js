import { imgAt, IMGS } from '../assets'
import { formatINR } from '../lib/money'

/* ---------- Cities & search options ---------- */

export const CITIES = [
  { id: 'mumbai', label: 'Mumbai', areas: 'Bandra · Lower Parel · Andheri' },
  { id: 'delhi', label: 'Delhi NCR', areas: 'Khan Market · CP · Hauz Khas' },
  { id: 'bengaluru', label: 'Bengaluru', areas: 'Indiranagar · Koramangala · Jayanagar' },
]

export const SERVICE_FILTERS = [
  'Any service',
  'Cut & beard',
  'Skin fade',
  'Straight razor',
  'Full service',
]

export const WHEN_OPTIONS = [
  'Today, any time',
  'Today, after 5pm',
  'Tomorrow morning',
  'This weekend',
]

/* ---------- Shops ---------- */

export const SHOPS = [
  // Mumbai
  {
    id: 'gilded-chair',
    kinds: ['Cut & beard', 'Skin fade', 'Full service'],
    name: 'The Gilded Chair',
    city: 'mumbai',
    area: 'Bandra West',
    dist: '0.4 km',
    rating: '4.94',
    reviews: 312,
    from: 950,
    badge: 'Editor’s pick',
    next: 'Next: 17:30',
    tags: ['Skin fade', 'Hot towel'],
    services: 'Fades · Beard sculpt · Hot towel shave',
    address: '17 Hill Road, Bandra West',
    pin: { left: '38%', top: '42%' },
  },
  {
    id: 'rue-noir',
    kinds: ['Straight razor', 'Cut & beard', 'Full service'],
    name: 'Rue Noir',
    city: 'mumbai',
    area: 'Lower Parel',
    dist: '1.3 km',
    rating: '4.91',
    reviews: 487,
    from: 1400,
    badge: 'Premium',
    next: 'Next: tomorrow',
    tags: ['Straight razor', 'Facial'],
    services: 'Straight razor · Facials · Cuts',
    address: '44 Kamala Mills, Lower Parel',
    pin: { left: '24%', top: '64%' },
  },
  {
    id: 'copper-comb',
    kinds: ['Cut & beard', 'Skin fade'],
    name: 'Copper & Comb',
    city: 'mumbai',
    area: 'Andheri West',
    dist: '1.6 km',
    rating: '4.79',
    reviews: 158,
    from: 700,
    badge: 'New',
    next: 'Next: 19:00',
    tags: ['Kids cuts', 'Buzz'],
    services: 'Classic cuts · Kids · Buzz',
    address: '9 Lokhandwala Complex, Andheri West',
    pin: { left: '72%', top: '58%' },
  },
  // Delhi NCR
  {
    id: 'marlowe-sons',
    kinds: ['Cut & beard', 'Full service'],
    name: 'Marlowe & Sons',
    city: 'delhi',
    area: 'Khan Market',
    dist: '0.9 km',
    rating: '4.88',
    reviews: 204,
    from: 1050,
    badge: 'Master barber',
    next: 'Next: 18:15',
    tags: ['Scissor cut', 'Grey blending'],
    services: 'Scissor work · Colour · Styling',
    address: '31 Khan Market, New Delhi',
    pin: { left: '62%', top: '30%' },
  },
  {
    id: 'atelier-bertrand',
    kinds: ['Full service', 'Straight razor', 'Cut & beard'],
    name: 'Atelier Bertrand',
    city: 'delhi',
    area: 'Connaught Place',
    dist: '2.8 km',
    rating: '4.97',
    reviews: 221,
    from: 1950,
    badge: 'Luxury',
    next: 'Next: Thu 11:00',
    tags: ['Grooming suite', 'Single malt'],
    services: 'Grooming suite · Shave · Cut',
    address: '8 Connaught Place, New Delhi',
    pin: { left: '14%', top: '22%' },
  },
  {
    id: 'fade-room',
    kinds: ['Skin fade', 'Cut & beard'],
    name: 'The Fade Room',
    city: 'delhi',
    area: 'Hauz Khas',
    dist: '2.1 km',
    rating: '4.86',
    reviews: 369,
    from: 850,
    badge: 'Popular',
    next: 'Next: 17:45',
    tags: ['Skin fade', 'Designs'],
    services: 'Fades · Line-ups · Designs',
    address: '2 Hauz Khas Village, New Delhi',
    pin: { left: '50%', top: '75%' },
  },
  // Bengaluru
  {
    id: 'ivory-blade',
    kinds: ['Skin fade', 'Cut & beard', 'Full service'],
    name: 'Ivory & Blade',
    city: 'bengaluru',
    area: 'Indiranagar',
    dist: '0.6 km',
    rating: '4.90',
    reviews: 276,
    from: 900,
    badge: 'Editor’s pick',
    next: 'Next: 16:45',
    tags: ['Skin fade', 'Beard oil'],
    services: 'Fades · Beard care · Styling',
    address: '100 Feet Road, Indiranagar',
    pin: { left: '44%', top: '34%' },
  },
  {
    id: 'barber-republic',
    kinds: ['Skin fade', 'Cut & beard'],
    name: 'The Barber Republic',
    city: 'bengaluru',
    area: 'Koramangala',
    dist: '1.1 km',
    rating: '4.83',
    reviews: 412,
    from: 780,
    badge: 'Popular',
    next: 'Next: 18:30',
    tags: ['Buzz cut', 'Line-up'],
    services: 'Classic cuts · Line-ups · Buzz',
    address: '5th Block, Koramangala',
    pin: { left: '68%', top: '52%' },
  },
  {
    id: 'session-house',
    kinds: ['Straight razor', 'Cut & beard', 'Full service'],
    name: 'Session House',
    city: 'bengaluru',
    area: 'Jayanagar',
    dist: '2.4 km',
    rating: '4.93',
    reviews: 189,
    from: 1200,
    badge: 'Premium',
    next: 'Next: tomorrow',
    tags: ['Scissor cut', 'Hot towel'],
    services: 'Scissor work · Hot towel · Shave',
    address: '11th Main, Jayanagar 4th Block',
    pin: { left: '28%', top: '70%' },
  },
].map((s, i) => ({ ...s, img: imgAt(i), price: formatINR(s.from) }))

/* ---------- Services ---------- */

export const SERVICES = [
  {
    name: 'Signature Cut & Style',
    amount: 1200,
    dur: '45 min',
    kind: 'Cut & beard',
    desc: 'Consultation, scissor and clipper work, wash, and a finish with the products that suit your hair.',
  },
  {
    name: 'Skin Fade',
    amount: 950,
    dur: '40 min',
    kind: 'Skin fade',
    desc: 'Precision taper to the skin with a clean line-up and neck finish.',
  },
  {
    name: 'Beard Sculpt & Hot Towel',
    amount: 800,
    dur: '30 min',
    kind: 'Cut & beard',
    desc: 'Shape, trim and razor detail followed by hot towel and balm.',
  },
  {
    name: 'Straight Razor Shave',
    amount: 1100,
    dur: '45 min',
    kind: 'Straight razor',
    desc: 'Traditional wet shave with pre-shave oil, two passes and a cold towel.',
  },
  {
    name: 'The Full Service',
    amount: 2100,
    dur: '1 h 30 min',
    kind: 'Full service',
    desc: 'Cut, beard sculpt, hot towel shave and scalp treatment. Chai or single malt included.',
  },
].map((s) => ({ ...s, price: formatINR(s.amount) }))

/* ---------- Barbers ---------- */

export const BARBERS = [
  { name: 'Arjun Salgaonkar', role: 'Master barber', years: '12 yrs', rating: '4.97', img: IMGS[2] },
  { name: 'Rehan Qureshi', role: 'Senior barber', years: '8 yrs', rating: '4.91', img: IMGS[1] },
  { name: 'Vikram Nair', role: 'Barber', years: '5 yrs', rating: '4.85', img: IMGS[0] },
]

export const FILTERS = ['All', 'Open now', 'Skin fade', 'Straight razor', 'Under ₹1,000', 'Top rated']

/* ---------- Marketing content ---------- */

export const STEPS = [
  {
    n: '01',
    title: 'Find your chair',
    body: 'Filter by service, price, distance and barber. See live availability on the map.',
  },
  {
    n: '02',
    title: 'Pick a slot',
    body: 'Real calendars from real shops. Choose your barber and the exact time that suits you.',
  },
  {
    n: '03',
    title: 'Confirm with a code',
    body: 'One text, six digits, done. Your booking lands in the shop’s diary instantly.',
  },
]

export const TESTIMONIALS = [
  {
    quote: 'I stopped calling three shops on a Friday. Two taps and the chair is mine.',
    name: 'Aditya Bhatnagar',
    meta: 'Member since 2024 · 31 bookings',
  },
  {
    quote: 'The barber profiles matter. I found someone who actually cuts wavy hair properly.',
    name: 'Rahul Menon',
    meta: 'Member since 2025 · 12 bookings',
  },
  {
    quote: 'Booked a straight razor shave the morning of a wedding. Confirmed in seconds.',
    name: 'Tanmay Deshpande',
    meta: 'Member since 2023 · 48 bookings',
  },
]

export const FAQS = [
  {
    q: 'How quickly is a booking confirmed?',
    a: 'Instantly. Shops publish live availability, so the slot you pick is held the moment you verify your number.',
  },
  {
    q: 'Can I cancel or reschedule?',
    a: 'Yes, free of charge up to four hours before your appointment. Inside four hours a ₹150 fee applies.',
  },
  {
    q: 'Do I pay through BarberNow?',
    a: 'You pay in the shop. We take a ₹49 booking fee and hold a card only to protect barbers from no-shows.',
  },
  {
    q: 'How are barbers vetted?',
    a: 'Every shop is visited before listing. Barbers verify qualifications and keep a 4.5+ rating to stay on the marketplace.',
  },
  {
    q: 'Can I request a specific barber?',
    a: 'Always. Availability is shown per barber, and returning members see their usual chair first.',
  },
]

export const REVIEWS = [
  {
    name: 'Daniel K.',
    date: '3 days ago',
    service: 'Signature Cut & Style',
    barber: 'Arjun',
    body: 'Third visit and the fade has been flawless every time. They actually listen at the consultation instead of nodding along.',
  },
  {
    name: 'Marcus O.',
    date: '1 week ago',
    service: 'Straight Razor Shave',
    barber: 'Rehan',
    body: 'Booked at 9pm for a 10am slot the next morning. Hot towel shave was worth twice the price.',
  },
  {
    name: 'Sameer R.',
    date: '2 weeks ago',
    service: 'Beard Sculpt',
    barber: 'Vikram',
    body: 'Precise work on a beard that was well past saving. Chai while you wait is a nice touch.',
  },
  {
    name: 'Eshan P.',
    date: '3 weeks ago',
    service: 'The Full Service',
    barber: 'Arjun',
    body: 'Ninety minutes that felt like a proper reset. Left with a cut that still looked sharp a month later.',
  },
]

export const GALLERY = [0, 1, 2, 0, 1, 2].map((n, i) => ({
  img: IMGS[n],
  span: i === 0 || i === 4 ? 2 : 1,
}))

export const QUICK_SLOTS = ['17:30', '18:15', '19:00', 'Tue 10:00', 'Tue 12:45', 'Wed 09:30']

export const OPENING_HOURS = [
  { days: 'Mon – Fri', hours: '09:00 – 21:00' },
  { days: 'Saturday', hours: '09:00 – 19:00' },
  { days: 'Sunday', hours: 'Closed' },
]

/* ---------- Appointments ---------- */

export const UPCOMING_APPOINTMENTS = [
  {
    mon: 'Aug',
    day: '18',
    time: '10:30',
    shop: 'The Gilded Chair',
    service: 'Signature Cut & Style',
    barber: 'Arjun Salgaonkar',
    address: '17 Hill Road, Bandra West',
    status: 'Confirmed',
    price: formatINR(1249),
    action: 'Reschedule',
    img: IMGS[0],
    tone: 'green',
  },
  {
    mon: 'Sep',
    day: '02',
    time: '18:15',
    shop: 'Atelier Bertrand',
    service: 'The Full Service',
    barber: 'Luc Bertrand',
    address: '8 Connaught Place, New Delhi',
    status: 'Confirmed',
    price: formatINR(2149),
    action: 'Reschedule',
    img: IMGS[2],
    tone: 'green',
  },
]

export const PAST_APPOINTMENTS = [
  {
    mon: 'Jul',
    day: '22',
    time: '11:00',
    shop: 'The Gilded Chair',
    service: 'Skin Fade',
    barber: 'Rehan Qureshi',
    address: '17 Hill Road, Bandra West',
    status: 'Completed',
    price: formatINR(999),
    action: 'Book again',
    img: IMGS[1],
    tone: 'neutral',
  },
  {
    mon: 'Jun',
    day: '30',
    time: '16:45',
    shop: 'Rue Noir',
    service: 'Straight Razor Shave',
    barber: 'Nikhil Vellore',
    address: '44 Kamala Mills, Lower Parel',
    status: 'Completed',
    price: formatINR(1149),
    action: 'Book again',
    img: IMGS[0],
    tone: 'neutral',
  },
  {
    mon: 'Jun',
    day: '05',
    time: '09:15',
    shop: 'The Fade Room',
    service: 'Beard Sculpt',
    barber: 'Vikram Nair',
    address: '2 Hauz Khas Village, New Delhi',
    status: 'Cancelled',
    price: formatINR(0),
    action: 'Book again',
    img: IMGS[2],
    tone: 'red',
  },
]

/* ---------- Barber dashboard ---------- */

export const DASH_NAV = ['Today', 'Calendar', 'Clients', 'Services', 'Payouts']

export const KPIS = [
  { label: 'Booked today', value: formatINR(15300), delta: '+18% vs last Sat', positive: true },
  { label: 'Chair utilisation', value: '86%', delta: '+12% this week', positive: true },
  { label: 'No-shows', value: '1', delta: '−2 vs last week', positive: true },
  { label: 'Rating', value: '4.94', delta: '312 reviews', positive: false },
]

export const SCHEDULE = [
  { time: '09:00', client: 'Daniel Kerr', service: 'Skin Fade', dur: '40 min', status: 'Done', amount: 950, tone: 'done' },
  { time: '09:45', client: 'Marcus Obi', service: 'Signature Cut & Style', dur: '45 min', status: 'Done', amount: 1200, tone: 'done' },
  { time: '10:30', client: 'Sameer Reddy', service: 'Beard Sculpt & Hot Towel', dur: '30 min', status: 'In chair', amount: 800, tone: 'active' },
  { time: '11:15', client: 'Eshan Prabhu', service: 'The Full Service', dur: '1 h 30', status: 'Next', amount: 2100, tone: 'next' },
  { time: '13:30', client: 'Omkar Bhave', service: 'Straight Razor Shave', dur: '45 min', status: 'Confirmed', amount: 1100, tone: 'idle' },
  { time: '14:30', client: 'Jay Wadhwa', service: 'Skin Fade', dur: '40 min', status: 'Confirmed', amount: 950, tone: 'idle' },
].map((s) => ({ ...s, price: formatINR(s.amount) }))

export const EARNINGS = [
  ['Mon', '38%'],
  ['Tue', '52%'],
  ['Wed', '44%'],
  ['Thu', '68%'],
  ['Fri', '86%'],
  ['Sat', '100%'],
  ['Sun', '12%'],
].map(([day, h], i) => ({ day, h, peak: i === 5 }))

export const WEEK_TOTAL = 79600

export const REQUESTS = [
  { client: 'Priya Nandan', detail: 'Signature Cut · Tue 19 Aug, 15:00 · new client' },
  { client: 'Karan Oberoi', detail: 'The Full Service · Wed 20 Aug, 11:30 · returning' },
]

/* ---------- Booking economics ---------- */

export const BOOKING_FEE = 49
export const TAKEN_SLOTS = ['11:15', '13:30', '16:00', '18:45']
