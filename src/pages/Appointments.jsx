import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../store/AppStore'
import { useToast } from '../components/Toast'
import { formatINR } from '../lib/money'
import { REFUND_METHODS } from '../lib/pricing'
import { fromISO, startOfToday } from '../lib/datetime'
import './Appointments.css'

const TABS = ['Upcoming', 'Past']

/* ------------------------------------------------------------------
   Cancel dialog — rule 6: refund goes to Wallet (instant) or UPI (2–3 days)
   ------------------------------------------------------------------ */

function CancelDialog({ booking, onClose, onConfirm }) {
  const [method, setMethod] = useState('wallet')
  const ref = useRef(null)
  const cashBooking = booking.paymentMode === 'offline'

  useEffect(() => {
    ref.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal" role="presentation" onMouseDown={onClose}>
      <div
        className="modal__box anim-pop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 className="modal__title" id="cancel-title" tabIndex={-1} ref={ref}>
          Cancel this booking?
        </h2>
        <p className="modal__text">
          {booking.serviceName} at {booking.salonName} · {booking.dateLabel}, {booking.slot}
        </p>

        {cashBooking ? (
          <p className="modal__note">
            This is a pay-at-salon booking, so there is nothing to refund — you simply won&rsquo;t
            be charged.
          </p>
        ) : (
          <fieldset className="modal__methods">
            <legend className="modal__legend">
              Refund {formatINR(booking.total)} to
            </legend>
            {Object.values(REFUND_METHODS).map((m) => (
              <label key={m.id} className={`refund${method === m.id ? ' is-active' : ''}`}>
                <input
                  type="radio"
                  name="refund-method"
                  value={m.id}
                  checked={method === m.id}
                  onChange={() => setMethod(m.id)}
                />
                <span className="refund__body">
                  <span className="refund__top">
                    <span className="refund__name">{m.label}</span>
                    <span className={`badge ${m.instant ? 'badge--green' : 'badge--amber'}`}>
                      {m.eta}
                    </span>
                  </span>
                  <span className="refund__note">{m.note}</span>
                </span>
              </label>
            ))}
          </fieldset>
        )}

        <div className="modal__actions">
          <button type="button" className="btn btn--outline" onClick={onClose}>
            Keep booking
          </button>
          <button
            type="button"
            className="btn btn--danger"
            onClick={() => onConfirm(cashBooking ? 'wallet' : method)}
          >
            Cancel booking
          </button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------
   Page
   ------------------------------------------------------------------ */

export default function Appointments() {
  const { myBookings, cancelBooking } = useApp()
  const { push } = useToast()
  const [tab, setTab] = useState('Upcoming')
  const [pending, setPending] = useState(null)

  const today = useMemo(() => startOfToday(), [])

  const { upcoming, past } = useMemo(() => {
    const up = []
    const old = []
    myBookings.forEach((b) => {
      const isPast = fromISO(b.date) < today
      if (b.status === 'cancelled' || isPast) old.push(b)
      else up.push(b)
    })
    up.sort((a, b) => a.date.localeCompare(b.date) || a.slot.localeCompare(b.slot))
    old.sort((a, b) => b.createdAt - a.createdAt)
    return { upcoming: up, past: old }
  }, [myBookings, today])

  const rows = tab === 'Upcoming' ? upcoming : past

  const doCancel = async (method) => {
    const booking = pending
    setPending(null)
    try {
      const refund = await cancelBooking(booking, method)
      push({
        tone: refund.amount > 0 ? 'success' : 'info',
        title: 'Booking cancelled',
        body:
          refund.amount > 0
            ? `${formatINR(refund.amount)} refunded to ${REFUND_METHODS[refund.method].label}`
            : 'Nothing to refund — this was a pay-at-salon booking.',
        meta: refund.amount > 0 ? REFUND_METHODS[refund.method].eta : undefined,
      })
    } catch (err) {
      push({ tone: 'warn', title: 'Could not cancel', body: err.message })
    }
  }

  return (
    <div className="shell shell--narrow appts">
      <h1 className="display appts__title">My bookings</h1>

      <div className="tabs appts__tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            className="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
          >
            {t}
            {t === 'Upcoming' && upcoming.length > 0 && (
              <span className="appts__count">{upcoming.length}</span>
            )}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="empty">
          <h2 className="empty__title">
            {tab === 'Upcoming' ? 'No upcoming bookings' : 'Nothing here yet'}
          </h2>
          <p className="empty__text">
            {tab === 'Upcoming'
              ? 'Book a salon and your appointment will show up here.'
              : 'Past and cancelled bookings will appear here.'}
          </p>
          <Link to="/salons" className="btn btn--gold">
            Browse salons
          </Link>
        </div>
      ) : (
        <ul className="appts__list">
          {rows.map((b) => {
            const cancelled = b.status === 'cancelled'
            return (
              <li key={b.id} className={`appt${cancelled ? ' is-cancelled' : ''}`}>
                <div className="appt__date">
                  <div className="appt__day">{fromISO(b.date).getDate()}</div>
                  <div className="appt__mon">
                    {fromISO(b.date).toLocaleString('en-IN', { month: 'short' })}
                  </div>
                  <div className="appt__time">{b.slot}</div>
                </div>

                <div className="appt__body">
                  <div className="appt__salon">{b.salonName}</div>
                  <div className="appt__service">{b.serviceName}</div>
                  <div className="appt__meta">
                    {b.modeLabel}
                    {b.staffName ? ` · ${b.staffName}` : ''}
                    {` · ${b.paymentMode === 'online' ? 'Paid online' : 'Cash at salon'}`}
                  </div>
                  {b.address && <div className="appt__addr">{b.address}</div>}
                  {cancelled && b.refund?.amount > 0 && (
                    <div className="appt__refund">
                      {formatINR(b.refund.amount)} refunded to{' '}
                      {REFUND_METHODS[b.refund.method]?.label} ·{' '}
                      {b.refund.status === 'completed' ? 'Completed' : 'Processing'}
                    </div>
                  )}
                </div>

                <div className="appt__right">
                  <span
                    className={`badge ${cancelled ? 'badge--red' : 'badge--green'}`}
                  >
                    {cancelled ? 'Cancelled' : 'Confirmed'}
                  </span>
                  <div className="appt__price money">{formatINR(b.total)}</div>
                  <div className="appt__ref">#{b.ref}</div>
                  {!cancelled && tab === 'Upcoming' && (
                    <button
                      type="button"
                      className="appt__cancel"
                      onClick={() => setPending(b)}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {pending && (
        <CancelDialog
          booking={pending}
          onClose={() => setPending(null)}
          onConfirm={doCancel}
        />
      )}
    </div>
  )
}
