import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useApp } from '../store/AppStore'
import { useToast } from '../components/Toast'
import { useT } from '../lib/i18n'
import AddressAutocomplete from '../components/AddressAutocomplete'
import { api } from '../lib/api'
import { formatINR } from '../lib/money'
import { PAYMENT_MODES, quote } from '../lib/pricing'
import { cityById } from '../data/seed'
import {
  buildCalendar,
  formatDateLabel,
  formatMonth,
  formatTime12,
  fromISO,
  startOfToday,
  toISO,
  WEEKDAY_INITIALS,
} from '../lib/datetime'
import { MONTHS_AHEAD, slotsFor, firstBookableDate, isSalonOpenOn } from '../lib/slots'
import './Book.css'

export default function Book() {
  const { salonId } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { publicSalons, salonsReady, createBooking, createBookingOnline, isFirstBooking, session } =
    useApp()
  const { push } = useToast()
  const t = useT()

  // Whether real online payments (Razorpay) are configured on the backend.
  // When off, "Pay online" still works as the instant demo flow.
  const [payEnabled, setPayEnabled] = useState(false)
  const [payChecked, setPayChecked] = useState(false)
  useEffect(() => {
    let alive = true
    api
      .paymentConfig()
      .then((c) => {
        if (!alive) return
        const enabled = Boolean(c.enabled)
        setPayEnabled(enabled)
        setPayChecked(true)
        // No real gateway → don't offer "Pay online" (which would otherwise
        // confirm a booking as paid without actually charging). Fall back to cash.
        if (!enabled) setPaymentMode('offline')
      })
      .catch(() => {
        if (!alive) return
        setPayEnabled(false)
        setPayChecked(true)
        setPaymentMode('offline')
      })
    return () => {
      alive = false
    }
  }, [])

  const salon = publicSalons.find((s) => s.id === salonId)

  const today = useMemo(() => startOfToday(), [])

  // The salon's own menu, loaded from the API. Customers can pick several
  // services (a cart) that are booked together in one appointment.
  const [services, setServices] = useState([])
  const [selectedIds, setSelectedIds] = useState(() =>
    params.get('service') ? [params.get('service')] : [],
  )

  useEffect(() => {
    if (!salonId) return undefined
    let alive = true
    api
      .salonServices(salonId)
      .then((res) => {
        if (!alive) return
        setServices(res.services)
        // Keep any valid pre-selection (deep link); else start with the first.
        setSelectedIds((cur) => {
          const valid = cur.filter((id) => res.services.some((s) => s.id === id))
          if (valid.length) return valid
          return res.services[0] ? [res.services[0].id] : []
        })
      })
      .catch(() => alive && setServices([]))
    return () => {
      alive = false
    }
  }, [salonId])

  const toggleService = (id) =>
    setSelectedIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))
  const [mode, setMode] = useState(salon?.serviceModes[0] ?? 'salon')
  const [address, setAddress] = useState('')
  const [addressELoc, setAddressELoc] = useState(null)
  const [staffId, setStaffId] = useState('')
  const [date, setDate] = useState(() => (salon ? firstBookableDate(salon, today) : toISO(today)))
  const [slot, setSlot] = useState('')
  const [paymentMode, setPaymentMode] = useState('online')
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [touched, setTouched] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  // Coupon (online only). `coupon` holds the validated {code,type,value,maxDiscount}
  // so the live preview mirrors the server's best-of math; the server re-validates.
  const [couponInput, setCouponInput] = useState('')
  const [coupon, setCoupon] = useState(null)
  const [couponBusy, setCouponBusy] = useState(false)
  const [couponMsg, setCouponMsg] = useState(null) // { tone, text }
  // Codes this customer can use at this salon right now, shown as tappable offers.
  const [offers, setOffers] = useState([])
  useEffect(() => {
    if (!salonId || session?.role !== 'customer') return undefined
    let alive = true
    api
      .availableCoupons(salonId)
      .then((r) => alive && setOffers(r.coupons || []))
      .catch(() => alive && setOffers([]))
    return () => {
      alive = false
    }
  }, [salonId, session?.role])

  const selected = services.filter((s) => selectedIds.includes(s.id))
  const servicesTotal = selected.reduce((sum, s) => sum + s.amount, 0)

  // Real slot availability for the chosen salon+date (which slots are full).
  const [availability, setAvailability] = useState(null)
  const [availTick, setAvailTick] = useState(0) // bump to force a refetch
  useEffect(() => {
    if (!salonId || !date) return undefined
    let alive = true
    api
      .bookingAvailability(salonId, date)
      .then((a) => alive && setAvailability(a))
      .catch(() => alive && setAvailability(null))
    return () => {
      alive = false
    }
  }, [salonId, date, availTick])

  // Slots depend on the salon's own opening hours + real availability.
  const slots = useMemo(
    () => (salon ? slotsFor(salon, date, toISO(today), availability) : []),
    [salon, date, today, availability],
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
    amount: servicesTotal,
    paymentMode,
    isFirstBooking,
    homeServiceFee: homeFee,
    offerPercent: salon?.offerActive ? salon.offerPercent : 0,
    coupon:
      paymentMode === 'online' && coupon && servicesTotal >= (coupon.minOrder || 0)
        ? coupon
        : null,
  })

  // Cash-blocked customer AND no online gateway → they can't pay at all.
  const noPayMethod = payChecked && !payEnabled && Boolean(session?.cashBlocked)

  const missing = []
  if (selected.length === 0) missing.push(t('book.missService'))
  if (!slot) missing.push(t('book.missSlot'))
  if (needsAddress && address.trim().length < 10) missing.push(t('book.missAddress'))
  const ready = missing.length === 0 && !noPayMethod

  if (!salon && !salonsReady) {
    return (
      <div className="route-loading" role="status" aria-live="polite">
        <span className="route-loading__spinner" aria-hidden="true" />
        <span className="sr-only">Loading…</span>
      </div>
    )
  }
  if (!salon) return <Navigate to="/salons" replace />

  // `override` lets a tapped offer apply its code directly (state updates are async).
  const applyCoupon = async (override) => {
    const code = (typeof override === 'string' ? override : couponInput).trim()
    if (!code || couponBusy) return
    if (paymentMode !== 'online') {
      setCouponMsg({ tone: 'warn', text: t('book.couponOnlineOnly') })
      return
    }
    if (selected.length === 0) {
      setCouponMsg({ tone: 'warn', text: t('book.couponPickService') })
      return
    }
    setCouponBusy(true)
    setCouponMsg(null)
    try {
      const { coupon: c, applied, priced: p } = await api.validateCoupon({
        couponCode: code,
        salonId: salon.id,
        serviceIds: selected.map((s) => s.id),
        mode,
      })
      if (!c) {
        setCoupon(null)
        setCouponMsg({ tone: 'warn', text: t('book.couponInvalid') })
        return
      }
      if (applied) {
        setCoupon({
          code: c.code,
          type: c.type,
          value: c.value,
          maxDiscount: c.maxDiscount,
          minOrder: c.minOrder,
        })
        setCouponInput(c.code)
        setCouponMsg(null) // the applied chip below tells the story
      } else {
        // Valid, but the customer's existing discount already saves more. Best-of
        // keeps the bigger one — name it, so the "not applied" is a favour, not a fail.
        const kept = (p?.offerDiscount || 0) + (p?.discount || 0)
        setCoupon(null)
        setCouponMsg({ tone: 'info', text: t('book.couponNotBetter', { amount: formatINR(kept) }) })
      }
    } catch (err) {
      setCoupon(null)
      setCouponMsg({ tone: 'warn', text: err.message || t('book.couponInvalid') })
    } finally {
      setCouponBusy(false)
    }
  }

  const clearCoupon = () => {
    setCoupon(null)
    setCouponInput('')
    setCouponMsg(null)
  }

  const confirm = async () => {
    setTouched(true)
    if (!ready || submitting) return

    const staff = salon.staff.find((p) => p.id === staffId) ?? null
    const draft = {
      salonId: salon.id,
      serviceIds: selected.map((s) => s.id),
      staffName: staff?.name ?? null,
      mode,
      address: needsAddress ? address.trim() : null,
      addressELoc: needsAddress ? addressELoc || undefined : undefined,
      date,
      dateLabel: formatDateLabel(date),
      slot,
      paymentMode,
      // Only online bookings honour a coupon; the server re-validates it.
      couponCode: paymentMode === 'online' && coupon ? coupon.code : undefined,
    }

    setSubmitting(true)
    try {
      // Real online payment → Razorpay Checkout. Cash (or online demo when
      // Razorpay isn't configured) → the direct create path.
      const useGateway = paymentMode === 'online' && payEnabled
      const booking = useGateway ? await createBookingOnline(draft) : await createBooking(draft)

      push({
        tone: 'success',
        title: t('book.confirmed'),
        body: `${selected.map((s) => s.name).join(' + ')} · ${formatDateLabel(date)}, ${formatTime12(slot)}`,
        meta:
          paymentMode === 'online'
            ? `Paid online · ${formatINR(booking.total)}`
            : `Pay ${formatINR(booking.total)} cash at the salon`,
      })

      navigate(`/confirmed/${booking.id}`, { replace: true })
    } catch (err) {
      // A user closing the Razorpay modal isn't an error worth alarming them.
      const cancelled = err.message === 'Payment cancelled.'
      // 409 = the slot filled up between loading and confirming.
      if (err.status === 409) {
        setSlot('')
        setAvailTick((t) => t + 1) // refresh which slots are free
        push({
          tone: 'warn',
          title: 'That time just got booked',
          body: 'Please pick another slot — availability has been refreshed.',
        })
      } else {
        push({
          tone: cancelled ? 'info' : 'warn',
          title: cancelled ? 'Payment cancelled' : 'Could not confirm booking',
          body: cancelled ? 'You can try the payment again when ready.' : err.message,
        })
      }
      setSubmitting(false)
    }
  }

  return (
    <div className="shell book">
      <div className="book__head">
        <div className="eyebrow">
          {salon.name} · {salon.area}
        </div>
        <h1 className="display book__title">{t('book.title')}</h1>
      </div>

      <div className="book__grid">
        <div className="book__main">
          {/* ---- 01 Service ---- */}
          <section className="step">
            <h2 className="step__legend">{t('book.step1')}</h2>
            <p className="step__hint">{t('book.step1hint')}</p>
            <div className="opts">
              {services.map((s) => {
                const active = selectedIds.includes(s.id)
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={`opt${active ? ' is-active' : ''}`}
                    aria-pressed={active}
                    aria-label={`${s.name}, ${s.mins} minutes, ${formatINR(s.amount)}`}
                    onClick={() => toggleService(s.id)}
                  >
                    <span className="opt__check" aria-hidden="true">
                      {active ? '✓' : '+'}
                    </span>
                    <span className="opt__body">
                      <span className="opt__name">{s.name}</span>
                      <span className="opt__meta">{s.mins} {t('salon.min')}</span>
                    </span>
                    <span className="opt__price money">{formatINR(s.amount)}</span>
                  </button>
                )
              })}
            </div>
          </section>

          {/* ---- 02 Where ---- */}
          <section className="step">
            <h2 className="step__legend">{t('book.step2')}</h2>
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
                      <span className="mode__name">{t(`mode.${m}`)}</span>
                      <span className="mode__note">{t(`mode.${m}Note`)}</span>
                      {fee > 0 && (
                        <span className="mode__fee money">{t('book.travel', { fee: formatINR(fee) })}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="step__fixed">
                <strong>{t(`mode.${salon.serviceModes[0]}`)}</strong> —{' '}
                {t(`mode.${salon.serviceModes[0]}Note`)} {t('book.onlyOffered')}
              </p>
            )}

            {needsAddress && (
              <label className="field book__address" htmlFor="book-address">
                <span className="field__label">{t('book.yourAddress')}</span>
                <AddressAutocomplete
                  id="book-address"
                  value={address}
                  onChange={(v) => {
                    setAddress(v)
                    setAddressELoc(null)
                  }}
                  onSelect={(item) => setAddressELoc(item.eLoc ?? null)}
                  near={salon ? cityById(salon.city).near : undefined}
                  placeholder={t('book.addressPlaceholder')}
                  ariaInvalid={touched && needsAddress && address.trim().length < 10}
                />
                <span className="field__hint">{t('book.addressHint')}</span>
              </label>
            )}
          </section>

          {/* ---- 03 Professional ---- */}
          <section className="step">
            <h2 className="step__legend">{t('book.step3')}</h2>
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
                  <span className="staffPick__name">{t('book.anyPro')}</span>
                  <span className="staffPick__meta">{t('book.firstAvail')}</span>
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
            <h2 className="step__legend">{t('book.step4')}</h2>
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
                        disabled={c.disabled || !isSalonOpenOn(salon, c.iso)}
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
                  {t('book.slotsOpen', {
                    date: formatDateLabel(date),
                    n: slots.filter((s) => !s.busy).length,
                  })}
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
                      {formatTime12(s.label)}
                    </button>
                  ))}
                </div>
                <p className="when__note">{t('book.slotsNote')}</p>
              </div>
            </div>
          </section>

          {/* ---- 05 Payment ---- */}
          <section className="step">
            <h2 className="step__legend">{t('book.step5')}</h2>
            <div className="pay">
              {Object.values(PAYMENT_MODES)
                // Hide "Pay online" until we confirm the gateway is live, so a
                // booking can't be confirmed as "paid" without actually charging.
                .filter((p) => p.id !== 'online' || payEnabled || !payChecked)
                .map((p) => {
                const active = paymentMode === p.id
                const savesNow = p.id === 'online' && isFirstBooking && selected.length > 0
                const blocked = p.id === 'offline' && session?.cashBlocked
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`pay__opt${active ? ' is-active' : ''}`}
                    aria-pressed={active}
                    disabled={blocked}
                    onClick={() => setPaymentMode(p.id)}
                  >
                    <span className="pay__top">
                      <span className="pay__name">{t(`pay.${p.id}`)}</span>
                      {savesNow && <span className="badge badge--gold">{t('book.tenOff')}</span>}
                      {blocked && <span className="badge badge--red">{t('book.disabled')}</span>}
                    </span>
                    <span className="pay__note">
                      {blocked ? t('book.blockedNote') : t(`pay.${p.id}Note`)}
                    </span>
                  </button>
                )
              })}
            </div>
            {paymentMode === 'offline' && !session?.cashBlocked && (
              <p className="pay__hint">{t('book.offlineHint')}</p>
            )}
            {payChecked && !payEnabled && !session?.cashBlocked && (
              <p className="pay__hint">{t('book.onlineUnavailable')}</p>
            )}
            {noPayMethod && (
              <p className="pay__hint pay__hint--warn">{t('book.noPayMethod')}</p>
            )}
          </section>
        </div>

        {/* ---- Summary ---- */}
        <aside className="summary">
          <div className="summary__head">
            <div className="eyebrow">{t('book.yourBooking')}</div>
          </div>
          <div className="summary__body">
            <div className="summary__row">
              <span>{t('book.salon')}</span>
              <span className="summary__val">{salon.name}</span>
            </div>
            <div className="summary__row">
              <span>{selected.length > 1 ? t('book.services') : t('book.service')}</span>
              <span className="summary__val">
                {selected.length ? selected.map((s) => s.name).join(', ') : '—'}
              </span>
            </div>
            <div className="summary__row">
              <span>{t('book.where')}</span>
              <span className="summary__val">{t(`mode.${mode}`)}</span>
            </div>
            <div className="summary__row">
              <span>{t('book.professional')}</span>
              <span className="summary__val">
                {salon.staff.find((p) => p.id === staffId)?.name ?? t('book.any')}
              </span>
            </div>
            <div className="summary__row">
              <span>{t('book.when')}</span>
              <span className="summary__val">
                {formatDateLabel(date)}
                {slot ? `, ${formatTime12(slot)}` : ''}
              </span>
            </div>

            <div className="summary__sep" />

            {selected.map((s) => (
              <div className="summary__row" key={s.id}>
                <span>{s.name}</span>
                <span className="summary__val money">{formatINR(s.amount)}</span>
              </div>
            ))}
            {selected.length === 0 && (
              <div className="summary__row">
                <span>{t('book.service')}</span>
                <span className="summary__val money">{formatINR(0)}</span>
              </div>
            )}
            {homeFee > 0 && (
              <div className="summary__row">
                <span>{t('book.homeVisit')}</span>
                <span className="summary__val money">{formatINR(homeFee)}</span>
              </div>
            )}
            {priced.offerDiscount > 0 && (
              <div className="summary__row summary__row--save">
                <span>{t('book.offerDiscount', { pct: priced.offerPercent })}</span>
                <span className="summary__val money">−{formatINR(priced.offerDiscount)}</span>
              </div>
            )}
            {priced.discount > 0 && (
              <div className="summary__row summary__row--save">
                <span>{t('book.firstDiscount')}</span>
                <span className="summary__val money">−{formatINR(priced.discount)}</span>
              </div>
            )}
            {priced.couponDiscount > 0 && (
              <div className="summary__row summary__row--save">
                <span>{t('book.couponRow', { code: priced.couponCode })}</span>
                <span className="summary__val money">−{formatINR(priced.couponDiscount)}</span>
              </div>
            )}

            {paymentMode === 'online' && (
              <div className="coupon">
                {priced.couponDiscount > 0 ? (
                  <div className="coupon__applied">
                    <span className="coupon__chip">
                      <svg viewBox="0 0 20 20" aria-hidden="true" className="coupon__tick">
                        <path
                          d="M4 10.5l3.5 3.5L16 6"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      {priced.couponCode}
                    </span>
                    <span className="coupon__save">
                      {t('book.couponSave', { amount: formatINR(priced.couponDiscount) })}
                    </span>
                    <button type="button" className="coupon__remove" onClick={clearCoupon}>
                      {t('book.couponRemove')}
                    </button>
                  </div>
                ) : (
                  <div className="coupon__field">
                    <input
                      className="coupon__input"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase().slice(0, 24))}
                      placeholder={t('book.couponPlaceholder')}
                      aria-label={t('book.couponPlaceholder')}
                      disabled={couponBusy}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), applyCoupon())}
                    />
                    <button
                      type="button"
                      className="btn btn--gold btn--sm coupon__apply"
                      onClick={applyCoupon}
                      disabled={couponBusy || couponInput.trim().length < 3}
                    >
                      {couponBusy ? t('book.couponChecking') : t('book.couponApply')}
                    </button>
                  </div>
                )}
                {couponMsg && priced.couponDiscount === 0 && (
                  <p className={`coupon__msg coupon__msg--${couponMsg.tone}`}>{couponMsg.text}</p>
                )}

                {priced.couponDiscount === 0 && offers.length > 0 && (
                  <div className="coupon__offers">
                    <p className="coupon__offersLabel">{t('book.couponOffers')}</p>
                    <ul className="coupon__offerList">
                      {offers.map((o) => {
                        const short = Math.max(0, (o.minOrder || 0) - servicesTotal)
                        const terms = [
                          o.type === 'percent'
                            ? t('book.couponOffPct', { pct: o.value })
                            : t('book.couponOffFlat', { amount: formatINR(o.value) }),
                          o.type === 'percent' && o.maxDiscount
                            ? t('book.couponUpTo', { amount: formatINR(o.maxDiscount) })
                            : null,
                          o.minOrder ? t('book.couponMin', { amount: formatINR(o.minOrder) }) : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')
                        return (
                          <li key={o.code}>
                            <button
                              type="button"
                              className="coupon__offer"
                              disabled={couponBusy || short > 0}
                              onClick={() => {
                                setCouponInput(o.code)
                                applyCoupon(o.code)
                              }}
                            >
                              <span className="coupon__offerCode">{o.code}</span>
                              <span className="coupon__offerTerms">{terms}</span>
                              {short > 0 && (
                                <span className="coupon__offerHint">
                                  {t('book.couponAddMore', { amount: formatINR(short) })}
                                </span>
                              )}
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="summary__total">
              <span className="summary__totalLabel">
                {paymentMode === 'online' ? t('book.payNow') : t('book.payAtSalon')}
              </span>
              <span className="summary__totalVal money">{formatINR(priced.total)}</span>
            </div>
          </div>

          {touched && missing.length > 0 && (
            <p className="summary__error" role="alert">
              {t('book.pleaseChoose', { x: missing.join(t('book.and')) })}
            </p>
          )}
          {noPayMethod && (
            <p className="summary__error" role="alert">
              {t('book.noPayMethod')}
            </p>
          )}

          <button
            type="button"
            className="btn btn--gold summary__cta"
            onClick={confirm}
            disabled={submitting || noPayMethod}
          >
            {submitting
              ? t('book.confirming')
              : paymentMode === 'online'
                ? t('book.pay', { amt: formatINR(priced.total) })
                : t('book.confirm')}
          </button>

          <p className="summary__fine">
            {t('book.bookingAs', { name: session?.name, phone: session?.phone })}
          </p>
        </aside>
      </div>
    </div>
  )
}
