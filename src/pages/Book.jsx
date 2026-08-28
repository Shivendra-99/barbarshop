import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useApp } from '../store/AppStore'
import { useToast } from '../components/Toast'
import AddressAutocomplete from '../components/AddressAutocomplete'
import { api } from '../lib/api'
import { formatINR } from '../lib/money'
import { PAYMENT_MODES, SERVICE_MODES, quote } from '../lib/pricing'
import { cityById } from '../data/seed'
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
import './Book.css'

export default function Book() {
  const { salonId } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { publicSalons, salonsReady, createBooking, isFirstBooking, session } = useApp()
  const { push } = useToast()

  const salon = publicSalons.find((s) => s.id === salonId)

  const today = useMemo(() => startOfToday(), [])

  // The salon's own menu, loaded from the API.
  const [services, setServices] = useState([])
  const [serviceId, setServiceId] = useState(params.get('service') || '')

  useEffect(() => {
    if (!salonId) return undefined
    let alive = true
    api
      .salonServices(salonId)
      .then((res) => {
        if (!alive) return
        setServices(res.services)
        // Default to the requested service, else the first one.
        setServiceId((cur) => {
          if (cur && res.services.some((s) => s.id === cur)) return cur
          return res.services[0]?.id ?? ''
        })
      })
      .catch(() => alive && setServices([]))
    return () => {
      alive = false
    }
  }, [salonId])
  const [mode, setMode] = useState(salon?.serviceModes[0] ?? 'salon')
  const [address, setAddress] = useState('')
  const [staffId, setStaffId] = useState('')
  const [date, setDate] = useState(() => (salon ? firstBookableDate(salon, today) : toISO(today)))
  const [slot, setSlot] = useState('')
  const [paymentMode, setPaymentMode] = useState('online')
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [touched, setTouched] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const service = services.find((s) => s.id === serviceId) ?? null

  // Slots depend on the salon's own opening hours, not a fixed window.
  const slots = useMemo(
    () => (salon ? slotsFor(salon, date, toISO(today)) : []),
    [salon, date, today],
  )

  // Drop a slot that stops being valid when the date changes.
  useEffect(() => {
    if (slot && !slots.some((s) => s.label === slot && !s.busy)) setSlot('')
  }, [slots, slot])

  const calendar = useMemo(
    () => buildCalendar(cursor.year, cursor.month, today),
    [cursor.year, cursor.month, today],
  )

  const minIdx = today.getFullYear() * 12 + today.getMonth()
  const curIdx = cursor.year * 12 + cursor.month
  const canBack = curIdx > minIdx
  const canFwd = curIdx < minIdx + MONTHS_AHEAD

  const shiftMonth = (delta) => {
    const d = new Date(cursor.year, cursor.month + delta, 1)
    const idx = d.getFullYear() * 12 + d.getMonth()
    if (idx < minIdx || idx > minIdx + MONTHS_AHEAD) return
    setCursor({ year: d.getFullYear(), month: d.getMonth() })
  }

  const offersBoth = salon && salon.serviceModes.length > 1
  const needsAddress = mode === 'home'
  const homeFee = mode === 'home' ? (salon?.homeServiceFee ?? 0) : 0

  const priced = quote({
    amount: service?.amount ?? 0,
    paymentMode,
    isFirstBooking,
    homeServiceFee: homeFee,
  })

  const missing = []
  if (!service) missing.push('a service')
  if (!slot) missing.push('a time slot')
  if (needsAddress && address.trim().length < 10) missing.push('your address')
  const ready = missing.length === 0

  if (!salon && !salonsReady) {
    return (
      <div className="route-loading" role="status" aria-live="polite">
        <span className="route-loading__spinner" aria-hidden="true" />
        <span className="sr-only">Loading…</span>
      </div>
    )
  }
  if (!salon) return <Navigate to="/salons" replace />

  const confirm = async () => {
    setTouched(true)
    if (!ready || submitting) return

    const staff = salon.staff.find((p) => p.id === staffId) ?? null
    setSubmitting(true)
    try {
      const booking = await createBooking({
        salonId: salon.id,
        serviceId: service.id,
        staffName: staff?.name ?? null,
        mode,
        address: needsAddress ? address.trim() : null,
        date,
        dateLabel: formatDateLabel(date),
        slot,
        paymentMode,
      })

      push({
        tone: 'success',
        title: 'Booking confirmed',
        body: `${service.name} · ${formatDateLabel(date)}, ${slot}`,
        meta:
          paymentMode === 'online'
            ? `Paid online · ${formatINR(booking.total)}`
            : `Pay ${formatINR(booking.total)} cash at the salon`,
      })

      navigate(`/confirmed/${booking.id}`, { replace: true })
    } catch (err) {
      push({ tone: 'warn', title: 'Could not confirm booking', body: err.message })
      setSubmitting(false)
    }
  }

  return (
    <div className="shell book">
      <div className="book__head">
        <div className="eyebrow">
          {salon.name} · {salon.area}
        </div>
        <h1 className="display book__title">Choose your service &amp; time</h1>
      </div>

      <div className="book__grid">
        <div className="book__main">
          {/* ---- 01 Service ---- */}
          <section className="step">
            <h2 className="step__legend">01 — Service</h2>
            <div className="opts">
              {services.map((s) => {
                const active = serviceId === s.id
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={`opt${active ? ' is-active' : ''}`}
                    aria-pressed={active}
                    aria-label={`${s.name}, ${s.mins} minutes, ${formatINR(s.amount)}`}
                    onClick={() => setServiceId(s.id)}
                  >
                    <span>
                      <span className="opt__name">{s.name}</span>
                      <span className="opt__meta">{s.mins} min</span>
                    </span>
                    <span className="opt__price money">{formatINR(s.amount)}</span>
                  </button>
                )
              })}
            </div>
          </section>

          {/* ---- 02 Where ---- */}
          <section className="step">
            <h2 className="step__legend">02 — Where</h2>
            {offersBoth ? (
              <div className="modes">
                {salon.serviceModes.map((m) => {
                  const active = mode === m
                  const fee = m === 'home' ? salon.homeServiceFee : 0
                  return (
                    <button
                      key={m}
                      type="button"
                      className={`mode${active ? ' is-active' : ''}`}
                      aria-pressed={active}
                      onClick={() => setMode(m)}
                    >
                      <span className="mode__name">{SERVICE_MODES[m].label}</span>
                      <span className="mode__note">{SERVICE_MODES[m].note}</span>
                      {fee > 0 && (
                        <span className="mode__fee money">+{formatINR(fee)} travel</span>
                      )}
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="step__fixed">
                <strong>{SERVICE_MODES[salon.serviceModes[0]].label}</strong> —{' '}
                {SERVICE_MODES[salon.serviceModes[0]].note} This salon does not offer the other
                option.
              </p>
            )}

            {needsAddress && (
              <label className="field book__address" htmlFor="book-address">
                <span className="field__label">Your address</span>
                <AddressAutocomplete
                  id="book-address"
                  value={address}
                  onChange={setAddress}
                  near={salon ? cityById(salon.city).near : undefined}
                  placeholder="Start typing your address…"
                  ariaInvalid={touched && needsAddress && address.trim().length < 10}
                />
                <span className="field__hint">
                  Search and pick your address, then add your flat / house number. The professional
                  travels here at your slot time.
                </span>
              </label>
            )}
          </section>

          {/* ---- 03 Professional ---- */}
          <section className="step">
            <h2 className="step__legend">03 — Professional</h2>
            <div className="staff">
              <button
                type="button"
                className={`staffPick${staffId === '' ? ' is-active' : ''}`}
                aria-pressed={staffId === ''}
                onClick={() => setStaffId('')}
              >
                <span className="staffPick__any" aria-hidden="true">
                  ★
                </span>
                <span>
                  <span className="staffPick__name">Any professional</span>
                  <span className="staffPick__meta">First available</span>
                </span>
              </button>
              {salon.staff.map((p) => {
                const active = staffId === p.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`staffPick${active ? ' is-active' : ''}`}
                    aria-pressed={active}
                    aria-label={`${p.name}, ${p.role}`}
                    onClick={() => setStaffId(p.id)}
                  >
                    <img src={p.img} alt="" aria-hidden="true" />
                    <span>
                      <span className="staffPick__name">{p.name}</span>
                      <span className="staffPick__meta">
                        ★ {p.rating.toFixed(1)} · {p.role}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </section>

          {/* ---- 04 When ---- */}
          <section className="step">
            <h2 className="step__legend">04 — Date &amp; time</h2>
            <div className="when">
              <div className="cal">
                <div className="cal__head">
                  <button
                    type="button"
                    className="cal__nav"
                    onClick={() => shiftMonth(-1)}
                    disabled={!canBack}
                    aria-label="Previous month"
                  >
                    ‹
                  </button>
                  <div className="cal__month">{formatMonth(cursor.year, cursor.month)}</div>
                  <button
                    type="button"
                    className="cal__nav"
                    onClick={() => shiftMonth(1)}
                    disabled={!canFwd}
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
                        onClick={() => setDate(c.iso)}
                      >
                        {c.label}
                      </button>
                    ),
                  )}
                </div>
              </div>

              <div>
                <div className="when__count">
                  {formatDateLabel(date)} · {slots.filter((s) => !s.busy).length} slots open
                </div>
                <div className="when__slots">
                  {slots.map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      className={`when__slot${slot === s.label ? ' is-selected' : ''}`}
                      disabled={s.busy}
                      aria-pressed={slot === s.label}
                      onClick={() => setSlot(s.label)}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                <p className="when__note">
                  Times shown in IST. Slots update live as other members book.
                </p>
              </div>
            </div>
          </section>

          {/* ---- 05 Payment ---- */}
          <section className="step">
            <h2 className="step__legend">05 — Payment</h2>
            <div className="pay">
              {Object.values(PAYMENT_MODES).map((p) => {
                const active = paymentMode === p.id
                const savesNow = p.id === 'online' && isFirstBooking && service
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`pay__opt${active ? ' is-active' : ''}`}
                    aria-pressed={active}
                    onClick={() => setPaymentMode(p.id)}
                  >
                    <span className="pay__top">
                      <span className="pay__name">{p.label}</span>
                      {savesNow && <span className="badge badge--gold">10% off</span>}
                    </span>
                    <span className="pay__note">{p.note}</span>
                  </button>
                )
              })}
            </div>
            {paymentMode === 'offline' && (
              <p className="pay__hint">
                Your booking is still confirmed instantly. The salon records the cash payment
                when you arrive.
              </p>
            )}
          </section>
        </div>

        {/* ---- Summary ---- */}
        <aside className="summary">
          <div className="summary__head">
            <div className="eyebrow">Your booking</div>
          </div>
          <div className="summary__body">
            <div className="summary__row">
              <span>Salon</span>
              <span className="summary__val">{salon.name}</span>
            </div>
            <div className="summary__row">
              <span>Service</span>
              <span className="summary__val">{service ? service.name : '—'}</span>
            </div>
            <div className="summary__row">
              <span>Where</span>
              <span className="summary__val">{SERVICE_MODES[mode].label}</span>
            </div>
            <div className="summary__row">
              <span>Professional</span>
              <span className="summary__val">
                {salon.staff.find((p) => p.id === staffId)?.name ?? 'Any'}
              </span>
            </div>
            <div className="summary__row">
              <span>When</span>
              <span className="summary__val">
                {formatDateLabel(date)}
                {slot ? `, ${slot}` : ''}
              </span>
            </div>

            <div className="summary__sep" />

            <div className="summary__row">
              <span>Service</span>
              <span className="summary__val money">{formatINR(service?.amount ?? 0)}</span>
            </div>
            {homeFee > 0 && (
              <div className="summary__row">
                <span>Home visit</span>
                <span className="summary__val money">{formatINR(homeFee)}</span>
              </div>
            )}
            {priced.discount > 0 && (
              <div className="summary__row summary__row--save">
                <span>First booking discount</span>
                <span className="summary__val money">−{formatINR(priced.discount)}</span>
              </div>
            )}

            <div className="summary__total">
              <span className="summary__totalLabel">
                {paymentMode === 'online' ? 'Pay now' : 'Pay at salon'}
              </span>
              <span className="summary__totalVal money">{formatINR(priced.total)}</span>
            </div>
          </div>

          {touched && !ready && (
            <p className="summary__error" role="alert">
              Please choose {missing.join(' and ')}.
            </p>
          )}

          <button
            type="button"
            className="btn btn--gold summary__cta"
            onClick={confirm}
            disabled={submitting}
          >
            {submitting
              ? 'Confirming…'
              : paymentMode === 'online'
                ? `Pay ${formatINR(priced.total)}`
                : 'Confirm booking'}
          </button>

          <p className="summary__fine">
            Booking as {session?.name} · +91 {session?.phone}. Free cancellation up to 4 hours
            before.
          </p>
        </aside>
      </div>
    </div>
  )
}
