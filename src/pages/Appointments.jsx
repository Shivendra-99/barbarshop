import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../store/AppStore'
import { useToast } from '../components/Toast'
import { useT } from '../lib/i18n'
import RescheduleDialog from '../components/RescheduleDialog'
import RatingDialog from '../components/RatingDialog'
import QueueBadge from '../components/QueueBadge'
import { formatINR } from '../lib/money'
import { REFUND_METHODS, refundFor, noShowRefund, slotStartMs } from '../lib/pricing'
import { fromISO, startOfToday, toISO, formatTime12, toMins } from '../lib/datetime'
import './Appointments.css'

const TABS = ['Upcoming', 'Past']

/* ------------------------------------------------------------------
   Cancel dialog — rule 6: refund goes to Wallet (instant) or UPI (2–3 days)
   ------------------------------------------------------------------ */

function CancelDialog({ booking, onClose, onConfirm }) {
  const [method, setMethod] = useState('wallet')
  const ref = useRef(null)
  const t = useT()
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
          {t('appt.cancelTitle')}
        </h2>
        <p className="modal__text">
          {booking.serviceName} at {booking.salonName} · {booking.dateLabel}, {formatTime12(booking.slot)}
        </p>

        {cashBooking ? (
          <p className="modal__note">{t('appt.cashRefundNote')}</p>
        ) : (
          <fieldset className="modal__methods">
            <legend className="modal__legend">{t('appt.chooseRefund')}</legend>
            {Object.values(REFUND_METHODS).map((m) => {
              const r = refundFor(booking, m.id)
              return (
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
                      <span className="refund__name">{t(`refund.${m.id}`)}</span>
                      <span className={`badge ${m.instant ? 'badge--green' : 'badge--amber'}`}>
                        {t(`refund.${m.id}Eta`)}
                      </span>
                    </span>
                    <span className="refund__amount money">
                      {t('appt.youGet', { amount: formatINR(r.amount) })}
                      {r.fee > 0
                        ? t('appt.feeLine', { pct: r.feePct, fee: formatINR(r.fee) })
                        : t('appt.noFee')}
                    </span>
                    <span className="refund__note">{t(`refund.${m.id}Note`)}</span>
                  </span>
                </label>
              )
            })}
            <p className="modal__note modal__note--fine">{t('appt.feeFine')}</p>
          </fieldset>
        )}

        <div className="modal__actions">
          <button type="button" className="btn btn--outline" onClick={onClose}>
            {t('appt.keepBooking')}
          </button>
          <button
            type="button"
            className="btn btn--danger"
            onClick={() => onConfirm(cashBooking ? 'wallet' : method)}
          >
            {t('appt.cancelBooking')}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------
   No-show refund chooser — the customer picks where their 85% goes
   (Wallet instant, or original UPI/bank in 2–3 days) after the salon
   marked them a no-show. Flat 15% penalty, so the amount is the same
   for both methods; only the destination and ETA differ.
   ------------------------------------------------------------------ */

function NoShowRefundDialog({ booking, onClose, onConfirm }) {
  const [method, setMethod] = useState('wallet')
  const ref = useRef(null)
  const t = useT()
  const r = noShowRefund(booking, method)

  useEffect(() => {
    ref.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal" role="presentation" onMouseDown={onClose}>
      <div
        className="modal__box anim-pop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="nsr-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 className="modal__title" id="nsr-title" tabIndex={-1} ref={ref}>
          {t('appt.nsRefundTitle')}
        </h2>
        <p className="modal__text">
          {booking.serviceName} at {booking.salonName} · {t('appt.youGet', { amount: formatINR(r.amount) })}
        </p>
        <fieldset className="modal__methods">
          <legend className="modal__legend">{t('appt.chooseRefund')}</legend>
          {Object.values(REFUND_METHODS).map((m) => (
            <label key={m.id} className={`refund${method === m.id ? ' is-active' : ''}`}>
              <input
                type="radio"
                name="ns-refund-method"
                value={m.id}
                checked={method === m.id}
                onChange={() => setMethod(m.id)}
              />
              <span className="refund__body">
                <span className="refund__top">
                  <span className="refund__name">{t(`refund.${m.id}`)}</span>
                  <span className={`badge ${m.instant ? 'badge--green' : 'badge--amber'}`}>
                    {t(`refund.${m.id}Eta`)}
                  </span>
                </span>
                <span className="refund__note">{t(`refund.${m.id}Note`)}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <div className="modal__actions">
          <button type="button" className="btn btn--outline" onClick={onClose}>
            {t('appt.keepBooking')}
          </button>
          <button type="button" className="btn btn--gold" onClick={() => onConfirm(method)}>
            {t('appt.nsRefundConfirm')}
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
  const { myBookings, cancelBooking, resolveNoShowRefund, rescheduleBooking, rateBooking } = useApp()
  const { push } = useToast()
  const t = useT()
  const [tab, setTab] = useState('Upcoming')
  const [pending, setPending] = useState(null)
  const [refundChoice, setRefundChoice] = useState(null)
  const [rescheduling, setRescheduling] = useState(null)
  const [rating, setRating] = useState(null)

  // Auto-prompt for a rating once a service is completed: when the customer
  // opens My Bookings and has a completed, unrated booking, pop the dialog.
  // Shown once per booking per session so it doesn't nag.
  const autoRated = useRef(new Set())
  useEffect(() => {
    if (rating) return
    const pending = myBookings.find(
      (b) => b.status === 'completed' && !b.rating && !b.noShow && !autoRated.current.has(b.id),
    )
    if (pending) {
      autoRated.current.add(pending.id)
      setRating(pending)
    }
  }, [myBookings, rating])

  const doRate = async ({ rating: stars, review }) => {
    const booking = rating
    try {
      await rateBooking(booking, { rating: stars, review })
      setRating(null)
      push({ tone: 'success', title: 'Thanks for rating!', body: `${booking.salonName} · ${stars}★` })
    } catch (err) {
      push({ tone: 'warn', title: 'Could not submit rating', body: err.message })
    }
  }

  const today = useMemo(() => startOfToday(), [])

  const { upcoming, past } = useMemo(() => {
    const up = []
    const old = []
    myBookings.forEach((b) => {
      const isPast = fromISO(b.date) < today
      if (b.status === 'cancelled' || isPast) old.push(b)
      else up.push(b)
    })
    up.sort((a, b) => a.date.localeCompare(b.date) || toMins(a.slot) - toMins(b.slot))
    old.sort((a, b) => b.createdAt - a.createdAt)
    return { upcoming: up, past: old }
  }, [myBookings, today])

  const rows = tab === 'Upcoming' ? upcoming : past

  const doReschedule = async ({ date, dateLabel, slot }) => {
    const booking = rescheduling
    try {
      await rescheduleBooking(booking, { date, dateLabel, slot })
      setRescheduling(null)
      push({
        tone: 'success',
        title: 'Booking rescheduled',
        body: `${booking.serviceName} · now ${dateLabel}, ${slot}`,
      })
    } catch (err) {
      push({ tone: 'warn', title: 'Could not reschedule', body: err.message })
    }
  }

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

  const doResolveRefund = async (method) => {
    const booking = refundChoice
    setRefundChoice(null)
    try {
      const refund = await resolveNoShowRefund(booking, method)
      push({
        tone: 'success',
        title: 'Refund on the way',
        body: `${formatINR(refund.amount)} to ${REFUND_METHODS[refund.method].label}`,
        meta: REFUND_METHODS[refund.method].eta,
      })
    } catch (err) {
      push({ tone: 'warn', title: 'Could not process refund', body: err.message })
    }
  }

  return (
    <div className="shell shell--narrow appts">
      <h1 className="display appts__title">{t('appt.title')}</h1>

      <div className="tabs appts__tabs" role="tablist">
        {TABS.map((tabName) => (
          <button
            key={tabName}
            type="button"
            role="tab"
            className="tab"
            aria-selected={tab === tabName}
            onClick={() => setTab(tabName)}
          >
            {tabName === 'Upcoming' ? t('appt.upcoming') : t('appt.past')}
            {tabName === 'Upcoming' && upcoming.length > 0 && (
              <span className="appts__count">{upcoming.length}</span>
            )}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="empty">
          <h2 className="empty__title">
            {tab === 'Upcoming' ? t('appt.noUpcoming') : t('appt.nothingHere')}
          </h2>
          <p className="empty__text">
            {tab === 'Upcoming' ? t('appt.noUpcomingText') : t('appt.pastText')}
          </p>
          <Link to="/salons" className="btn btn--gold">
            {t('appt.browse')}
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
                  <div className="appt__time">{formatTime12(b.slot)}</div>
                </div>

                <div className="appt__body">
                  <div className="appt__salon">{b.salonName}</div>
                  {b.items?.length > 1 ? (
                    <ul className="appt__items">
                      {b.items.map((it, i) => (
                        <li key={`${it.name}-${i}`}>
                          <span>{it.name}</span>
                          <span className="money">{formatINR(it.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="appt__service">{b.serviceName}</div>
                  )}
                  <div className="appt__meta">
                    {t(`mode.${b.mode}`)}
                    {b.staffName ? ` · ${b.staffName}` : ''}
                    {` · ${b.paymentMode === 'online' ? t('appt.paidOnline') : t('appt.cashAtSalon')}`}
                  </div>
                  {b.razorpay?.paymentId && (
                    <div className="appt__pay">Razorpay · {b.razorpay.paymentId}</div>
                  )}
                  {b.completionOtp && b.status === 'confirmed' && (
                    <div className="appt__otp">
                      {t('appt.serviceOtp')} <strong>{b.completionOtp}</strong>
                      <span className="appt__otpHint">{t('appt.otpHint')}</span>
                    </div>
                  )}
                  {!cancelled && b.salonPhone && (
                    <a className="appt__call" href={`tel:+91${b.salonPhone}`}>
                      <svg viewBox="0 0 24 24" aria-hidden="true" width="14" height="14">
                        <path
                          fill="currentColor"
                          d="M6.6 10.8a15.5 15.5 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.24 11.4 11.4 0 0 0 3.6.58 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.4 11.4 0 0 0 .58 3.6 1 1 0 0 1-.24 1Z"
                        />
                      </svg>
                      {t('appt.callSalon')}
                    </a>
                  )}
                  {b.address && <div className="appt__addr">{b.address}</div>}
                  {cancelled && b.refund?.status === 'pending' && b.refund?.amount > 0 ? (
                    <div className="appt__refund appt__refund--pending">
                      <div className="appt__refundPending">
                        {t('appt.nsRefundPending', { amount: formatINR(b.refund.amount) })}
                      </div>
                      <button
                        type="button"
                        className="btn btn--gold btn--sm"
                        onClick={() => setRefundChoice(b)}
                      >
                        {t('appt.nsRefundChoose')}
                      </button>
                    </div>
                  ) : (
                    cancelled && b.refund?.amount > 0 && (
                      <div className="appt__refund">
                        {t('appt.refundedTo', {
                          amount: formatINR(b.refund.amount),
                          method: t(`refund.${b.refund.method}`),
                        })}{' '}
                        · {b.refund.status === 'completed' ? t('appt.completed') : t('appt.processing')}
                      </div>
                    )
                  )}
                  {!cancelled && b.mode === 'salon' && b.date === toISO(today) && (
                    <QueueBadge bookingId={b.id} />
                  )}
                </div>

                <div className="appt__right">
                  <span
                    className={`badge ${cancelled ? 'badge--red' : 'badge--green'}`}
                  >
                    {cancelled ? t('appt.cancelled') : t('appt.confirmed')}
                  </span>
                  <div className="appt__price money">{formatINR(b.total)}</div>
                  <div className="appt__ref">#{b.ref}</div>
                  {!cancelled && tab === 'Upcoming' && (
                    <div className="appt__actions">
                      {slotStartMs(b) - Date.now() >= 2 * 60 * 60 * 1000 && (
                        <button
                          type="button"
                          className="appt__reschedule"
                          onClick={() => setRescheduling(b)}
                        >
                          {t('appt.reschedule')}
                        </button>
                      )}
                      <button
                        type="button"
                        className="appt__cancel"
                        onClick={() => setPending(b)}
                      >
                        {t('appt.cancel')}
                      </button>
                    </div>
                  )}
                  {!cancelled && (b.status === 'completed' || fromISO(b.date) < today) &&
                    (b.rating ? (
                      <div className="appt__rated">{t('appt.youRated', { n: b.rating })}</div>
                    ) : (
                      <button type="button" className="appt__rate" onClick={() => setRating(b)}>
                        {t('appt.rateSalon')}
                      </button>
                    ))}
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

      {refundChoice && (
        <NoShowRefundDialog
          booking={refundChoice}
          onClose={() => setRefundChoice(null)}
          onConfirm={doResolveRefund}
        />
      )}

      {rescheduling && (
        <RescheduleDialog
          booking={rescheduling}
          onClose={() => setRescheduling(null)}
          onConfirm={doReschedule}
        />
      )}

      {rating && (
        <RatingDialog booking={rating} onClose={() => setRating(null)} onSubmit={doRate} />
      )}
    </div>
  )
}
