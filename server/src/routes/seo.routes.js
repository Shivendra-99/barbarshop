import { Router } from 'express'
import { Salon } from '../models/Salon.js'
import { Service } from '../models/Service.js'
import { asyncHandler } from '../middleware/error.js'

const router = Router()
const SITE = 'https://www.salonsaathi.in'

// Public pages worth indexing. Signed-in areas are excluded (see robots.txt).
const PAGES = [
  ['/', '1.0', 'daily'],
  ['/salons', '0.9', 'daily'],
  ['/help', '0.5', 'monthly'],
  ['/about-us', '0.5', 'monthly'],
  ['/contact-us', '0.5', 'monthly'],
  ['/refund-policy', '0.3', 'yearly'],
  ['/privacy-policy', '0.3', 'yearly'],
  ['/terms-and-conditions', '0.3', 'yearly'],
]

const url = (loc, { lastmod, priority, changefreq }) =>
  `  <url><loc>${SITE}${loc}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}<changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`

/**
 * GET /api/sitemap.xml — served at https://www.salonsaathi.in/sitemap.xml via
 * a Vercel rewrite. Built from the database so every approved salon page is
 * listed the moment it goes live (salon pages are what people search for).
 */
router.get(
  '/sitemap.xml',
  asyncHandler(async (_req, res) => {
    const salons = await Salon.find({ status: 'approved' }, { _id: 1, updatedAt: 1 }).lean()
    const rows = [
      ...PAGES.map(([loc, priority, changefreq]) => url(loc, { priority, changefreq })),
      ...salons.map((s) =>
        url(`/salon/${s._id}`, {
          lastmod: s.updatedAt ? new Date(s.updatedAt).toISOString().slice(0, 10) : null,
          priority: '0.8',
          changefreq: 'weekly',
        }),
      ),
    ]
    res
      .type('application/xml')
      .set('Cache-Control', 'public, max-age=3600')
      .send(
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join('\n')}\n</urlset>\n`,
      )
  }),
)

/* ------------------ Link previews (WhatsApp, Facebook …) ------------------ */

const CATEGORY_LABEL = { mens: "Men's salon", unisex: 'Unisex salon', parlour: 'Beauty parlour' }
const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const titleCase = (s) => String(s || '').replace(/\b\w/g, (c) => c.toUpperCase())

function previewHtml({ title, description, url, image, status = 200 }) {
  return {
    status,
    html: `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="SalonSaathi">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(image)}">
</head><body><h1>${esc(title)}</h1><p>${esc(description)}</p><p><a href="${esc(url)}">Book on SalonSaathi</a></p></body></html>
`,
  }
}

/**
 * GET /api/og/salon/:id — a tiny HTML page carrying this salon's title,
 * description and photo for link-preview bots, which don't run JavaScript.
 * vercel.json routes /salon/:id here ONLY for preview bots (by user-agent).
 * People and Googlebot still get the normal app; Google renders JS itself.
 */
router.get(
  '/og/salon/:id',
  asyncHandler(async (req, res) => {
    const id = /^[a-f0-9]{24}$/i.test(req.params.id) ? req.params.id : null
    const salon = id ? await Salon.findById(id).lean().catch(() => null) : null

    let page
    if (!salon || salon.status !== 'approved') {
      page = previewHtml({
        status: 404,
        title: 'SalonSaathi — Book Your Appointment, Skip The Wait',
        description: "Book men's salons, unisex salons and beauty parlours near you.",
        url: SITE,
        image: `${SITE}/og/unisex.jpg`,
      })
    } else {
      const cheapest = await Service.findOne({ salon: salon._id }).sort({ amount: 1 }).lean()
      const city = salon.district || titleCase(salon.city)
      const kind = CATEGORY_LABEL[salon.category] || 'Salon'
      page = previewHtml({
        title: `${salon.name}, ${salon.area} — Book on SalonSaathi`,
        description: [
          `${kind} in ${salon.area}, ${city}.`,
          cheapest ? `Services from ₹${cheapest.amount}.` : null,
          'Book a slot online and skip the wait.',
        ]
          .filter(Boolean)
          .join(' '),
        url: `${SITE}/salon/${salon._id}`,
        image: salon.photo?.startsWith('data:image/')
          ? `${SITE}/api/og/salon/${salon._id}/photo`
          : `${SITE}/og/${CATEGORY_LABEL[salon.category] ? salon.category : 'unisex'}.jpg`,
      })
    }
    res.status(page.status).type('html').set('Cache-Control', 'public, max-age=3600').send(page.html)
  }),
)

/** GET /api/og/salon/:id/photo — the owner's uploaded cover (stored as a data URL) as a real image file. */
router.get(
  '/og/salon/:id/photo',
  asyncHandler(async (req, res) => {
    const id = /^[a-f0-9]{24}$/i.test(req.params.id) ? req.params.id : null
    const salon = id ? await Salon.findById(id, { photo: 1, status: 1 }).lean().catch(() => null) : null
    const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(salon?.photo || '')
    if (!m || salon.status !== 'approved') return res.status(404).end()
    res.type(m[1]).set('Cache-Control', 'public, max-age=86400').send(Buffer.from(m[2], 'base64'))
  }),
)

export default router
