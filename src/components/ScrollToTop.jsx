import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** Resets scroll position on navigation, the way the prototype did on route change. */
export default function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathname])

  return null
}
