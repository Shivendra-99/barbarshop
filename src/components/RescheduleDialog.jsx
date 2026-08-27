import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../store/AppStore'
import {
  buildCalendar,
  formatDateLabel,
  formatMonth,
  fromISO,
  startOfToday,
  toISO,
  WEEKDAY_INITIALS,
} from '../lib/datetime'
import { MONTHS_AHEAD, slotsFor, firstBookableDate } from '../lib/slots'
import './RescheduleDialog.css'

/**
 * Lets a customer move a confirmed booking to a new date + slot. Reuses the same
 * slot geometry as the booking page. Service, price and salon stay the same.
 */
export default function RescheduleDialog({ booking, onClose, onConfirm }) {
  const { findSalon } = useApp()
  const ref = useRef(null)
  const today = useMemo(() => startOfToday(), [])

  // The booking only stores the salon name, so pull hours from the live salon;
  // fall back to sensible defaults if it isn't loaded.
  const salon = useMemo(() => {
    const found = findSalon(booking.salonId)
    return {
      id: booking.salonId,
      opens: found?.opens ?? '09:00',
      closes: found?.closes ?? '21:00',
    }
  }, [findSalon, booking.salonId])

  const [date, setDate] = useState(() => firstBookableDate(salon, today))
  const [slot, setSlot] = useState('')
  const [cursor, setCursor] = useState(() => {
    const d = fromISO(firstBookableDate(salon, today))
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    ref.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const todayISO = toISO(today)
  const slots = useMemo(() => slotsFor(salon, date, todayISO), [salon, date, todayISO])

  // Drop a slot that stops being valid when the date changes.
  useEffect(() => {
    if (slot && !slots.some((s) => s.label === slot && !s.busy)) setSlot('')
  }, [slots, slot])

  const cells = useMemo(
    () => buildCalendar(cursor.year, cursor.month, today),
    [cursor, today],
  )

  const minMonth = today.getFullYear() * 12 + today.getMonth()
  const maxMonth = minMonth + MONTHS_AHEAD
  const curMonth = cursor.year * 12 + cursor.month
  const shift = (delta) => {
    const next = curMonth + delta
    if (next < minMonth || next > maxMonth) return
    setCursor({ year: Math.floor(next / 12), month: next % 12 })
  }

  const unchanged = date === booking.date && slot === booking.slot
  const canSave = slot && !unchanged && !busy

  const save = async () => {
    if (!canSave) return
    setBusy(true)
    try {
      await onConfirm({ date, dateLabel: formatDateLabel(date), slot })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal" role="presentation" onMouseDown={onClose}>
      <div
        className="modal__box rsx anim-pop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rsx-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 className="modal__title" id="rsx-title" tabIndex={-1} ref={ref}>
          Reschedule booking
        </h2>
        <p className="modal__text">
          {booking.serviceName} at {booking.salonName} · currently {booking.dateLabel},{' '}
          {booking.slot}
        </p>

        <div className="rsx__cal">
          <div className="rsx__calHead">
            <button
              type="button"
              className="rsx__nav"
              onClick={() => shift(-1)}
              disabled={curMonth <= minMonth}
              aria-label="Previous month"
            >
              ‹
            </button>
            <span className="rsx__month">{formatMonth(cursor.year, cursor.month)}</span>
            <button
              type="button"
              className="rsx__nav"
              onClick={() => shift(1)}
              disabled={curMonth >= maxMonth}
              aria-label="Next month"
            >
              ›
            </button>
          </div>

          <div className="rsx__grid rsx__dow">
            {WEEKDAY_INITIALS.map((d, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <span key={i} className="rsx__dowCell">
                {d}
              </span>
            ))}
          </div>
          <div className="rsx__grid">
            {cells.map((c) =>
              c.blank ? (
                <span key={c.key} className="rsx__day is-blank" />
              ) : (
                <button
                  key={c.key}
                  type="button"
                  className={`rsx__day${c.iso === date ? ' is-active' : ''}`}
                  disabled={c.disabled}
                  onClick={() => setDate(c.iso)}
                >
                  {c.label}
                </button>
              ),
            )}
          </div>
        </div>

        <div className="rsx__slots" role="group" aria-label="Available times">
          {slots.map((s) => (
            <button
              key={s.label}
              type="button"
              className={`rsx__slot${slot === s.label ? ' is-active' : ''}`}
              disabled={s.busy}
              onClick={() => setSlot(s.label)}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="modal__actions">
          <button type="button" className="btn btn--outline" onClick={onClose}>
            Keep current
          </button>
          <button type="button" className="btn btn--gold" onClick={save} disabled={!canSave}>
            {busy ? 'Saving…' : 'Confirm new time'}
          </button>
        </div>
      </div>
    </div>
  )
}
