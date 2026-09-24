import { Router } from 'express'
import { Salon } from '../models/Salon.js'
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

export default router
