import { Navigate, useLocation } from 'react-router-dom'
import { useApp } from '../store/AppStore'

/**
 * Gates a route behind a session. Waits for the initial session-restore to
 * finish (`ready`) before deciding, so a valid token isn't bounced to login on
 * first paint. The attempted path is carried through as `next`.
 */
export default function Protected({ children, role }) {
  const { ready, isSignedIn, role: currentRole } = useApp()
  const location = useLocation()

  if (!ready) {
    return (
      <div className="route-loading" role="status" aria-live="polite">
        <span className="route-loading__spinner" aria-hidden="true" />
        <span className="sr-only">Loading…</span>
      </div>
    )
  }

  if (!isSignedIn) {
    const next = `${location.pathname}${location.search}`
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />
  }

  if (role && currentRole !== role) {
    return <Navigate to="/" replace />
  }

  return children
}
