/* Seed data — mirrors the frontend's src/data/seed.js so both sides agree. */

export const SERVICES = {
  mens: [
    { code: 'm-haircut', name: 'Haircut & Styling', amount: 250, mins: 30, desc: 'Consultation, wash, cut and a finish with product that suits your hair.' },
    { code: 'm-beard', name: 'Beard Trim & Shape', amount: 180, mins: 20, desc: 'Shape, trim and razor detail followed by hot towel and balm.' },
    { code: 'm-shave', name: 'Classic Razor Shave', amount: 300, mins: 30, desc: 'Traditional wet shave with pre-shave oil, two passes and a cold towel.' },
    { code: 'm-colour', name: 'Hair Colour', amount: 700, mins: 60, desc: 'Ammonia-free colour with grey coverage and a conditioning finish.' },
    { code: 'm-massage', name: 'Head Massage', amount: 350, mins: 30, desc: 'Warm oil champi to relieve tension, finished with a steam towel.' },
    { code: 'm-groom', name: 'Full Grooming Package', amount: 1200, mins: 90, desc: 'Haircut, beard sculpt, shave, face cleanup and head massage.' },
  ],
  unisex: [
    { code: 'u-haircut', name: 'Haircut & Blow Dry', amount: 450, mins: 45, desc: 'Consultation, wash, precision cut and a blow-dry finish.' },
    { code: 'u-spa', name: 'Hair Spa Treatment', amount: 900, mins: 60, desc: 'Deep-conditioning masque, scalp massage and steam.' },
    { code: 'u-colour', name: 'Global Hair Colour', amount: 2500, mins: 120, desc: 'Full-head colour with bond protection and a gloss finish.' },
    { code: 'u-keratin', name: 'Keratin Smoothening', amount: 3500, mins: 180, desc: 'Frizz control and shine, lasting up to four months.' },
    { code: 'u-mani', name: 'Manicure', amount: 500, mins: 40, desc: 'Shape, cuticle care, exfoliation, massage and polish.' },
    { code: 'u-pedi', name: 'Pedicure', amount: 700, mins: 50, desc: 'Soak, scrub, callus care, massage and polish.' },
  ],
  parlour: [
    { code: 'p-threading', name: 'Eyebrow Threading', amount: 80, mins: 15, desc: 'Precise shaping to suit your face, finished with soothing gel.' },
    { code: 'p-cleanup', name: 'Face Cleanup', amount: 600, mins: 40, desc: 'Cleanse, exfoliate, steam, extraction and a calming pack.' },
    { code: 'p-facial', name: 'Gold Radiance Facial', amount: 1500, mins: 60, desc: '24k gold facial for glow and even tone, with a lifting massage.' },
    { code: 'p-wax', name: 'Full Body Waxing', amount: 1800, mins: 75, desc: 'Rica wax, low-pain technique, with post-wax soothing lotion.' },
    { code: 'p-pedi', name: 'Spa Pedicure', amount: 700, mins: 50, desc: 'Aroma soak, scrub, mask, extended massage and polish.' },
    { code: 'p-bridal', name: 'Bridal Makeup', amount: 8000, mins: 150, desc: 'HD airbrush makeup, hairstyling, draping and touch-up kit.' },
  ],
}

/** ownerCode ties each salon to a seeded owner (own-1..4). */
export const SALONS = [
  { name: 'The Gilded Chair', category: 'mens', city: 'lucknow', area: 'Gomti Nagar', address: 'Vibhuti Khand, Gomti Nagar', dist: '1.2 km', rating: 4.9, reviews: 312, badge: "Editor's pick", ownerCode: 'own-1', serviceModes: ['salon', 'home'], homeServiceFee: 150, status: 'approved', opens: '09:00', closes: '21:00' },
  { name: 'Ivory Lounge', category: 'unisex', city: 'lucknow', area: 'Hazratganj', address: 'Mall Avenue, Hazratganj', dist: '2.4 km', rating: 4.8, reviews: 428, badge: 'Popular', ownerCode: 'own-2', serviceModes: ['salon', 'home'], homeServiceFee: 200, status: 'approved', opens: '10:00', closes: '20:30' },
  { name: 'Blush Beauty Bar', category: 'parlour', city: 'lucknow', area: 'Aliganj', address: 'Kapoorthala, Aliganj', dist: '3.1 km', rating: 4.9, reviews: 265, badge: 'Premium', ownerCode: 'own-2', serviceModes: ['salon', 'home'], homeServiceFee: 250, status: 'approved', opens: '10:00', closes: '20:00' },
  { name: 'Sharp & Co.', category: 'mens', city: 'lucknow', area: 'Indira Nagar', address: 'Sector 14, Indira Nagar', dist: '4.0 km', rating: 4.7, reviews: 186, badge: 'New', ownerCode: 'own-3', serviceModes: ['salon'], homeServiceFee: 0, status: 'approved', opens: '09:30', closes: '21:00' },
  { name: 'Lumière Studio', category: 'unisex', city: 'lucknow', area: 'Lulu Mall', address: 'Lulu Mall, Sushant Golf City', dist: '5.6 km', rating: 4.8, reviews: 501, badge: 'Trending', ownerCode: 'own-4', serviceModes: ['salon'], homeServiceFee: 0, status: 'approved', opens: '11:00', closes: '22:00' },
  { name: 'The Glow Room', category: 'parlour', city: 'lucknow', area: 'Gomti Nagar', address: 'Viraj Khand, Gomti Nagar', dist: '1.8 km', rating: 4.6, reviews: 143, badge: 'New', ownerCode: 'own-4', serviceModes: ['home'], homeServiceFee: 0, status: 'pending', opens: '10:00', closes: '19:00' },
  { name: 'Rue Noir', category: 'mens', city: 'mumbai', area: 'Bandra West', address: 'Hill Road, Bandra West', dist: '0.8 km', rating: 4.9, reviews: 487, badge: 'Premium', ownerCode: 'own-1', serviceModes: ['salon', 'home'], homeServiceFee: 300, status: 'approved', opens: '10:00', closes: '21:00' },
  { name: 'Maison Belle', category: 'unisex', city: 'mumbai', area: 'Lower Parel', address: 'Kamala Mills, Lower Parel', dist: '2.2 km', rating: 4.8, reviews: 372, badge: 'Popular', ownerCode: 'own-2', serviceModes: ['salon'], homeServiceFee: 0, status: 'approved', opens: '10:00', closes: '20:00' },
  { name: 'Velvet Mane', category: 'parlour', city: 'mumbai', area: 'Andheri West', address: 'Lokhandwala, Andheri West', dist: '3.4 km', rating: 4.7, reviews: 219, badge: 'Trending', ownerCode: 'own-3', serviceModes: ['salon', 'home'], homeServiceFee: 350, status: 'approved', opens: '10:30', closes: '20:30' },
  { name: 'Atelier Bertrand', category: 'mens', city: 'delhi', area: 'Khan Market', address: 'Khan Market, New Delhi', dist: '1.1 km', rating: 5.0, reviews: 221, badge: 'Luxury', ownerCode: 'own-1', serviceModes: ['salon'], homeServiceFee: 0, status: 'approved', opens: '10:00', closes: '20:00' },
  { name: 'Oriental Bloom', category: 'unisex', city: 'delhi', area: 'Hauz Khas', address: 'Hauz Khas Village, New Delhi', dist: '2.9 km', rating: 4.8, reviews: 340, badge: 'Popular', ownerCode: 'own-4', serviceModes: ['salon', 'home'], homeServiceFee: 250, status: 'approved', opens: '10:00', closes: '21:00' },
  { name: 'Saanjh Beauty Parlour', category: 'parlour', city: 'delhi', area: 'Connaught Place', address: 'Inner Circle, Connaught Place', dist: '1.6 km', rating: 4.9, reviews: 288, badge: "Editor's pick", ownerCode: 'own-3', serviceModes: ['salon', 'home'], homeServiceFee: 300, status: 'approved', opens: '10:00', closes: '20:00' },
]
