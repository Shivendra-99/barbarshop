import { useState } from 'react'
import { fileToCompressedDataUrl } from '../lib/image'
import './panel-ui.css'

/*
 * Salon settings shared by "Add salon" and "Edit salon", so both forms offer
 * the same controls: photo, exact map pin, slot length, chairs, weekly day off,
 * holidays, offer, and the owner's payout (UPI / bank) details.
 */

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const SLOT_LENGTHS = [15, 20, 30, 45, 60]

/** Defaults for a new salon's settings (merge into a form's initial state). */
export const SETTINGS_DEFAULTS = {
  photo: null,
  mapPin: null, // { lat, lng, accuracy } once captured
  slotMinutes: 30,
  capacity: 1,
  daysOff: [],
  closedDates: [],
  offerActive: false,
  offerPercent: 0,
}

/** The settings fields as the API expects them. */
export const settingsPayload = (form) => ({
  photo: form.photo ?? null,
  slotMinutes: Number(form.slotMinutes),
  capacity: Math.max(1, Number(form.capacity) || 1),
  daysOff: form.daysOff,
  closedDates: form.closedDates,
  offerActive: Boolean(form.offerActive),
  offerPercent: form.offerActive ? Math.max(0, Math.min(50, Number(form.offerPercent) || 0)) : 0,
  ...(form.mapPin ? { mapPin: { lat: form.mapPin.lat, lng: form.mapPin.lng } } : {}),
})

/** Cover photo picker. */
export function PhotoField({ photo, onChange }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const onFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file
    if (!file) return
    setErr('')
    setBusy(true)
    try {
      onChange(await fileToCompressedDataUrl(file))
    } catch (error) {
      setErr(error.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="se-photo">
      <div className="se-photo__preview">
        {photo ? (
          <img src={photo} alt="Salon cover preview" />
        ) : (
          <span className="se-photo__empty">No photo — stock image is used</span>
        )}
      </div>
      <div className="se-photo__controls">
        <label className="btn btn--outline btn--sm se-photo__btn">
          {busy ? 'Processing…' : photo ? 'Change photo' : 'Upload photo'}
          <input type="file" accept="image/*" onChange={onFile} hidden disabled={busy} />
        </label>
        {photo && (
          <button type="button" className="btn btn--ghost-gold btn--sm" onClick={() => onChange(null)}>
            Remove
          </button>
        )}
        <span className="se-hint">JPG/PNG · auto-resized. Shown as the salon banner.</span>
        {err && <span className="field__error">{err}</span>}
      </div>
    </div>
  )
}

/** "Pin my salon here": the phone's GPS position, rejected when too vague. */
export function MapPinField({ mapPin, onPin, status }) {
  const [pinning, setPinning] = useState(false)
  const [err, setErr] = useState('')
  const pinHere = () => {
    if (!navigator.geolocation) return setErr('This device can’t share its location.')
    setPinning(true)
    setErr('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPinning(false)
        const accuracy = Math.round(pos.coords.accuracy)
        // A laptop's Wi-Fi guess can be kilometres off; don't save that as "exact".
        if (accuracy > 500) {
          setErr(`Location is only accurate to ±${accuracy} m. Try again on your phone, inside the salon.`)
          return
        }
        onPin({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy })
      },
      () => {
        setPinning(false)
        setErr('Location permission was denied. Allow location access and try again.')
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }
  return (
    <div className="field">
      <span className="field__label">Map location</span>
      <div className="sed-pin">
        <span className="sed-pin__status">
          {mapPin ? `Exact pin captured (±${mapPin.accuracy} m). Save to keep it.` : status}
        </span>
        <button type="button" className="btn btn--outline btn--sm" onClick={pinHere} disabled={pinning}>
          {pinning ? 'Locating…' : 'Pin my salon here'}
        </button>
      </div>
      <span className="field__hint">Do this while standing inside your salon, on your phone.</span>
      {err && <span className="field__error">{err}</span>}
    </div>
  )
}

/** Slot length, chairs, weekly day off, holidays and the salon-wide offer. */
export function SlotSettings({ form, setForm }) {
  const [newDate, setNewDate] = useState('')
  const set = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const toggleDay = (d) =>
    setForm((f) => ({
      ...f,
      daysOff: f.daysOff.includes(d) ? f.daysOff.filter((x) => x !== d) : [...f.daysOff, d].sort(),
    }))
  const addClosedDate = () => {
    if (!newDate || form.closedDates.includes(newDate)) return
    setForm((f) => ({ ...f, closedDates: [...f.closedDates, newDate].sort() }))
    setNewDate('')
  }
  const removeClosedDate = (d) => setForm((f) => ({ ...f, closedDates: f.closedDates.filter((x) => x !== d) }))

  return (
    <>
      <div className="ssf__grid">
        <label className="field">
          <span className="field__label">Slot length</span>
          <select className="field__input" value={form.slotMinutes} onChange={set('slotMinutes')}>
            {SLOT_LENGTHS.map((m) => (
              <option key={m} value={m}>
                {m} min
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field__label">Chairs (per slot)</span>
          <input
            type="number"
            min="1"
            max="50"
            step="1"
            className="field__input"
            value={form.capacity}
            onChange={set('capacity')}
          />
          <span className="field__hint">How many customers you can serve at the same time.</span>
        </label>
      </div>

      <div className="se-block">
        <span className="field__label">Weekly day off</span>
        <div className="se-days">
          {WEEKDAYS.map((label, d) => (
            <button
              key={label}
              type="button"
              className={`se-day${form.daysOff.includes(d) ? ' is-off' : ''}`}
              aria-pressed={form.daysOff.includes(d)}
              onClick={() => toggleDay(d)}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="se-hint">Highlighted days are closed — no slots offered.</span>
      </div>

      <div className="se-block">
        <span className="field__label">Blocked dates (holidays)</span>
        <div className="se-dateRow">
          <input type="date" className="field__input" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
          <button type="button" className="btn btn--outline btn--sm" onClick={addClosedDate}>
            Add
          </button>
        </div>
        {form.closedDates.length > 0 && (
          <div className="se-chips">
            {form.closedDates.map((d) => (
              <span key={d} className="se-chip">
                {d}
                <button type="button" onClick={() => removeClosedDate(d)} aria-label={`Remove ${d}`}>
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="se-block">
        <label className="se-offerToggle">
          <input type="checkbox" checked={form.offerActive} onChange={set('offerActive')} />
          <span className="field__label" style={{ margin: 0 }}>
            Run an offer (discount at checkout)
          </span>
        </label>
        {form.offerActive && (
          <label className="field" style={{ marginTop: 10, maxWidth: 220 }}>
            <span className="field__label">Discount %</span>
            <input
              type="number"
              min="1"
              max="50"
              step="1"
              className="field__input"
              value={form.offerPercent}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  offerPercent: Math.max(0, Math.min(50, Number(e.target.value.replace(/\D/g, '')) || 0)),
                }))
              }
            />
            <span className="se-hint">
              {form.offerPercent > 0
                ? `Customers get ${form.offerPercent}% off the service total (max 50%).`
                : 'Enter a percentage between 1 and 50.'}
            </span>
          </label>
        )}
      </div>
    </>
  )
}

/* ------------------------- Payout (UPI / bank) ------------------------- */

export const PAYOUT_EMPTY = { upi: '', accountName: '', accountNumber: '', ifsc: '' }

/** API payout → form values ('' instead of null). */
export const payoutToForm = (p) => ({
  ...PAYOUT_EMPTY,
  ...Object.fromEntries(Object.entries(p ?? {}).map(([k, v]) => [k, v ?? ''])),
})

export const payoutFilled = (p) => Object.values(p).some((v) => String(v).trim())

/** Same rules as the server; returns a message, or '' when fine (or empty). */
export function payoutProblem(p) {
  if (!payoutFilled(p)) return ''
  const upi = p.upi.trim()
  const bank = [p.accountName, p.accountNumber, p.ifsc].map((v) => v.trim())
  if (upi && !/^[a-z0-9._-]{2,256}@[a-z]{2,64}$/i.test(upi)) return 'Enter a valid UPI ID, e.g. name@okaxis'
  if (bank.some(Boolean)) {
    if (!bank.every(Boolean)) return 'Fill in name, account number and IFSC together.'
    if (!/^\d{9,18}$/.test(bank[1])) return 'Account number is 9–18 digits'
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(bank[2])) return 'Enter a valid IFSC, e.g. SBIN0001234'
  }
  return ''
}

const PAYOUT_FIELDS = [
  { k: 'upi', label: 'UPI ID', ph: 'name@okaxis', mode: 'email' },
  { k: 'accountName', label: 'Account holder name', ph: 'As on bank passbook' },
  { k: 'accountNumber', label: 'Account number', ph: '9–18 digits', mode: 'numeric' },
  { k: 'ifsc', label: 'IFSC', ph: 'SBIN0001234' },
]

/** UPI ID, or bank account name + number + IFSC. */
export function PayoutFields({ value, onChange }) {
  return (
    <div className="ope__grid">
      {PAYOUT_FIELDS.map((f) => (
        <label className="field" key={f.k}>
          <span className="field__label">{f.label}</span>
          <input
            className="field__input"
            inputMode={f.mode}
            autoComplete="off"
            value={value[f.k]}
            placeholder={f.ph}
            onChange={(e) => onChange({ ...value, [f.k]: e.target.value })}
          />
        </label>
      ))}
    </div>
  )
}
