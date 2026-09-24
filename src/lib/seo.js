import { useEffect } from 'react'

/**
 * Per-route SEO for this single-page app. Google renders JavaScript, so it reads
 * the title, description, canonical and JSON-LD we set here. The static
 * index.html carries only site-wide defaults — no canonical or og:url, because
 * a hard-coded one would tell Google every page is the homepage.
 */
export const SITE = 'https://www.salonsaathi.in'
const DEFAULT_TITLE = 'SalonSaathi — Book Your Appointment, Skip The Wait'
const DEFAULT_DESC =
  "Book men's salons, unisex salons and beauty parlours near you. At the salon or at home, pay online or cash."

function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setCanonical(href) {
  let el = document.head.querySelector('link[rel="canonical"]')
  if (!href) return el?.remove()
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

/**
 * useSeo({ title, description, path, noindex, jsonLd })
 *  - `path` → canonical + og:url (omit for private pages).
 *  - `noindex` → keep the page out of search (bookings, account, panels).
 *  - `jsonLd` → structured data object (or null).
 */
export function useSeo({ title, description, path, noindex = false, jsonLd = null } = {}) {
  const ld = jsonLd ? JSON.stringify(jsonLd) : ''
  useEffect(() => {
    const fullTitle = title ? `${title} | SalonSaathi` : DEFAULT_TITLE
    const desc = description || DEFAULT_DESC
    const url = path ? `${SITE}${path}` : null

    document.title = fullTitle
    setMeta('name', 'description', desc)
    setMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow')
    setMeta('property', 'og:title', fullTitle)
    setMeta('property', 'og:description', desc)
    setMeta('name', 'twitter:title', fullTitle)
    setMeta('name', 'twitter:description', desc)
    if (url) setMeta('property', 'og:url', url)
    setCanonical(noindex ? null : url)

    let script = document.getElementById('seo-jsonld')
    if (ld) {
      if (!script) {
        script = document.createElement('script')
        script.type = 'application/ld+json'
        script.id = 'seo-jsonld'
        document.head.appendChild(script)
      }
      script.textContent = ld
    } else {
      script?.remove()
    }
  }, [title, description, path, noindex, ld])
}

/** Keeps a private page (login, bookings, panels) out of search results. */
export const useNoIndex = (title) => useSeo({ title, noindex: true })
