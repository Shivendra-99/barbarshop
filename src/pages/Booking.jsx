import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBooking } from '../state/BookingContext'
import { BARBERS, SERVICES, TAKEN_SLOTS } from '../data/content'
import {
  buildCalendar,
  buildSlots,
  formatDateLabel,
  formatMonth,
  fromISO,
  startOfToday,
  WEEKDAY_INITIALS,
} from '../lib/datetime'
import { formatINR } from '../lib/money'
import './Booking.css'

/** Matches the `slotInterval` option from the design source (30 / 45 / 60). */
const SLOT_INTERVAL = 45

/** How many months ahead the calendar may be paged. */
const MONTHS_AHEAD = 4

const STEP_LABELS = [
  { n: '1', label: 'Service' },
  { n: '2', label: 'Date & time' },
  { n: '3', label: 'Verify' },
]

export default function Booking() {
  const navigate = useNavigate()
  const {
    shop,
    service,
    selectService,
    barber,
    selectBarber,
    date,
    selectDate,
    slot,
    selectSlot,
    fee,
    total,
    startVerification,
  } = useBooking()

  const today = useMemo(() => startOfToday(), [])
  const [cursor, setCursor] = useState(() => {
    const d = fromISO(date)
    return { year: d.getFullYear(), month: d.getMonth() }
  })

  const minCursor = { year: today.getFullYear(), month: today.getMonth() }
  const maxDate = new Date(today.getFullYear(), today.getMonth() + MONTHS_AHEAD, 1)
  const maxCursor = { year: maxDate.getFullYear(), month: maxDate.getMonth() }

  const asIndex = (c) => c.year * 12 + c.month
  const canGoBack = asIndex(cursor) > asIndex(minCursor)
  const canGoForward = asIndex(cursor) < asIndex(maxCursor)

  const shiftMonth = (delta) => {
    setCursor((c) => {
      const next = new Date(c.year, c.month + delta, 1)
      const nextIdx = next.getFullYear() * 12 + next.getMonth()
      if (nextIdx < asIndex(minCursor) || nextIdx > asIndex(maxCursor)) return c
      return { year: next.getFullYear(), month: next.getMonth() }
    })
  }

  const calendar = useMemo(
    () => buildCalendar(cursor.year, cursor.month, today),
    [cursor.year, cursor.month, today],
  )

  const slots = useMemo(() => buildSlots(SLOT_INTERVAL, TAKEN_SLOTS), [])
  const openSlots = slots.filter((s) => !s.busy).length

  const goToVerify = () => {
    startVerification()
    navigate('/verify')
  }

  return (
    <div className="shell booking">
      {/* ---------------- Step rail ---------------- */}
      <ol className="steps">
        {STEP_LABELS.map((s, i) => (
          <li key={s.n} className={`steps__item${i < 2 ? ' is-done' : ''}`}>
            <span className="steps__n">{s.n}</span>
            <span className="steps__label">{s.label}</span>
            <span className="steps__rule" />
          </li>
        ))}
      </ol>

      <div className="booking__grid">
        <div className="booking__main">
          <div className="eyebrow eyebrow--tight booking__kicker">
            {shop.name} · {shop.area}
          </div>
          <h1 className="display booking__title">Choose your service &amp; time</h1>

          {/* ---------------- Service ---------------- */}
          <div className="booking__legend">01 — Service</div>
          <div className="opts">
            {SERVICES.slice(0, 4).map((s) => {
              const active = service.name === s.name
              return (
                <button
                  key={s.name}
                  type="button"
                  className={`opt${active ? ' is-active' : ''}`}
                  aria-pressed={active}
                  aria-label={`${s.name}, ${s.dur}, ${s.price}`}
                  onClick={() => selectService(s.name)}
                >
                  <span>
                    <span className="opt__name">{s.name}</span>
                    <span className="opt__dur">{s.dur}</span>
                  </span>
                  <span className="opt__price">{s.price}</span>
                </button>
              )
            })}
          </div>

          {/* ---------------- Barber ---------------- */}
          <div className="booking__legend">02 — Barber</div>
          <div className="barbers">
            {BARBERS.map((b) => {
              const active = barber === b.name
              return (
                <button
                  key={b.name}
                  type="button"
                  className={`barber${active ? ' is-active' : ''}`}
                  aria-pressed={active}
                  aria-label={`${b.name}, ${b.role}, rated ${b.rating}`}
                  onClick={() => selectBarber(b.name)}
                >
                  <img src={b.img} alt="" aria-hidden="true" />
                  <span>
                    <span className="barber__name">{b.name}</span>
                    <span className="barber__meta">
                      ★ {b.rating} · {b.role}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>

          {/* ---------------- Date & time ---------------- */}
          <div className="booking__legend">03 — Date &amp; time</div>
          <div className="when">
            <div className="cal">
              <div className="cal__head">
                <button
                  type="button"
                  className="cal__nav"
                  onClick={() => shiftMonth(-1)}
                  disabled={!canGoBack}
                  aria-label="Previous month"
                >
                  ‹
                </button>
                <div className="cal__month">{formatMonth(cursor.year, cursor.month)}</div>
                <button
                  type="button"
                  className="cal__nav"
                  onClick={() => shiftMonth(1)}
                  disabled={!canGoForward}
                  aria-label="Next month"
                >
                  ›
                </button>
              </div>

              <div className="cal__weekdays">
                {WEEKDAY_INITIALS.map((w, i) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <div key={`${w}-${i}`}>{w}</div>
                ))}
              </div>

              <div className="cal__grid">
                {calendar.map((c) =>
                  c.blank ? (
                    <span key={c.key} className="cal__blank" />
                  ) : (
                    <button
                      key={c.key}
                      type="button"
                      className={`cal__day${date === c.iso ? ' is-selected' : ''}`}
                      disabled={c.disabled}
                      aria-pressed={date === c.iso}
                      aria-label={c.closed ? `${c.label} — closed` : c.label}
                      onClick={() => selectDate(c.iso)}
                    >
                      {c.label}
                    </button>
                  ),
                )}
              </div>
            </div>

            <div>
              <div className="when__count">
                {formatDateLabel(date)} · {openSlots} slots
              </div>
              <div className="when__slots">
                {slots.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    className={`when__slot${slot === s.label ? ' is-selected' : ''}`}
                    disabled={s.busy}
                    aria-pressed={slot === s.label}
                    onClick={() => selectSlot(s.label)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <p className="when__note">
                Times shown in GMT+1. Slots update live as other members book.
              </p>
            </div>
          </div>
        </div>

        {/* ---------------- Summary ---------------- */}
        <aside className="summary">
          <div className="summary__head">
            <div className="eyebrow eyebrow--tight">Your booking</div>
          </div>
          <div className="summary__body">
            <div className="summary__row">
              <span>Service</span>
              <span className="summary__val">{service.name}</span>
            </div>
            <div className="summary__row">
              <span>Barber</span>
              <span className="summary__val">{barber}</span>
            </div>
            <div className="summary__row">
              <span>Date</span>
              <span className="summary__val">{formatDateLabel(date)}</span>
            </div>
            <div className="summary__row">
              <span>Time</span>
              <span className="summary__val">{slot}</span>
            </div>

            <div className="summary__sep" />

            <div className="summary__row">
              <span>Service</span>
              <span className="summary__val">{service.price}</span>
            </div>
            <div className="summary__row">
              <span>Booking fee</span>
              <span className="summary__val">{formatINR(fee)}</span>
            </div>
            <div className="summary__total">
              <span className="summary__totalLabel">Total</span>
              <span className="summary__totalVal">{formatINR(total)}</span>
            </div>
          </div>

          <button type="button" className="btn btn--gold summary__cta" onClick={goToVerify}>
            Continue to verification
          </button>
          <p className="summary__fine">Pay in shop. Card only held for no-shows.</p>
        </aside>
      </div>
    </div>
  )
}
