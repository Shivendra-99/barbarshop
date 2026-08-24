import { Navigate, useLocation } from 'react-router-dom'
import { useApp } from '../store/AppStore'

/**
 * Gates a route behind an OTP session. The attempted path is carried through
 * as `next` so login can return the customer to exactly where they were.
 */
export default function Protected({ children, role }) {
  const { isSignedIn, role: currentRole } = useApp()
  const location = useLocation()

  if (!isSignedIn) {
    const next = `${location.pathname}${location.search}`
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />
  }

  if (role && currentRole !== role) {
    return <Navigate to="/" replace />
  }

  return children
}
