import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useT } from '../lib/i18n'
import './QueueBadge.css'

const POLL_MS = 15000

/**
 * Live queue position for a today, at-salon booking. Polls every 15s so the
 * count drops as the salon serves people ahead. Renders nothing until it has
 * data (or if the booking isn't in an active queue).
 */
export default function QueueBadge({ bookingId }) {
  const [q, setQ] = useState(null)
  const t = useT()

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
    q.ahead === 0
      ? t('queue.next')
      : q.ahead === 1
        ? t('queue.aheadOne')
        : t('queue.ahead', { n: q.ahead })

  return (
    <div className={`queue${q.ahead === 0 ? ' queue--next' : ''}`}>
      <span className="queue__dot" aria-hidden="true" />
      <span className="queue__text">
        {t('queue.live')} · <strong>{label}</strong>
        <span className="queue__pos">{t('queue.pos', { pos: q.position, total: q.total })}</span>
      </span>
    </div>
  )
}
