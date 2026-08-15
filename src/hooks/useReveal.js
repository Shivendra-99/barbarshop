import { useEffect, useRef } from 'react'

/**
 * Adds `is-visible` the first time the element scrolls into view, driving the
 * `.reveal` transition in base.css.
 *
 * Because `.reveal` starts at opacity 0, a missed trigger means permanently
 * invisible content — so IntersectionObserver is backed by a plain geometry
 * check on mount, scroll and resize. IO can be throttled or skipped entirely in
 * background tabs and prerenders; the fallback guarantees the content appears.
 */
export default function useReveal({ threshold = 0.15, rootMargin = '0px 0px -8% 0px' } = {}) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined

    let observer = null
    let done = false

    const cleanup = () => {
      if (observer) observer.disconnect()
      window.removeEventListener('scroll', check)
      window.removeEventListener('resize', check)
    }

    const show = () => {
      if (done) return
      done = true
      el.classList.add('is-visible')
      cleanup()
    }

    function check() {
      const rect = el.getBoundingClientRect()
      const vh = window.innerHeight || document.documentElement.clientHeight
      // Anything at or above the fold line has been reached — including
      // elements already scrolled past, which a jump to a deep scroll position
      // would otherwise skip entirely.
      if (rect.top < vh * 0.92) show()
    }

    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) show()
        },
        { threshold, rootMargin },
      )
      observer.observe(el)
    }

    window.addEventListener('scroll', check, { passive: true })
    window.addEventListener('resize', check, { passive: true })

    check()

    return cleanup
  }, [threshold, rootMargin])

  return ref
}
