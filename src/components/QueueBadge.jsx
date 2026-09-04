import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import './QueueBadge.css'

const POLL_MS = 15000

/**
 * Live queue position for a today, at-salon booking. Polls every 15s so the
 * count drops as the salon serves people ahead. Renders nothing until it has
 * data (or if the booking isn't in an active queue).
 */
export default function QueueBadge({ bookingId }) {
  const [q, setQ] = useState(null)

  useEffect(() => {
    let alive = true
    let timer

    const tick = async () => {
      try {
        const data = await api.bookingQueue(bookingId)
        if (alive) setQ(data)
      } catch {
        /* ignore transient errors, keep last value */
      }
      if (alive) timer = window.setTimeout(tick, POLL_MS)
    }
    tick()

    return () => {
      alive = false
      window.clearTimeout(timer)
    }
  }, [bookingId])

  if (!q || !q.inQueue) return null

  const label =
    q.ahead === 0 ? 'You’re next!' : `${q.ahead} ${q.ahead === 1 ? 'person' : 'people'} ahead of you`

  return (
    <div className={`queue${q.ahead === 0 ? ' queue--next' : ''}`}>
      <span className="queue__dot" aria-hidden="true" />
      <span className="queue__text">
        Live queue · <strong>{label}</strong>
        <span className="queue__pos">
          You’re #{q.position} of {q.total}
        </span>
      </span>
    </div>
  )
}
