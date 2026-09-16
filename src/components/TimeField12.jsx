import './TimeField12.css'

/**
 * A 12-hour clock picker (hour 1–12 · minutes · AM/PM) that always shows the
 * familiar AM/PM format regardless of the device locale — the native
 * <input type="time"> falls back to a 24-hour clock on many Android/desktop
 * setups, which confused salon owners. The value in and out stays the canonical
 * "HH:MM" 24-hour string the rest of the app (and the API) already uses.
 */

const pad = (n) => String(n).padStart(2, '0')

// Minute options in 5-minute steps — enough granularity for open/close times.
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5)
const HOURS12 = Array.from({ length: 12 }, (_, i) => i + 1) // 1..12

/** "HH:MM" (24h) → { h12, min, period }. Falls back to 12:00 AM. */
function parse(value) {
  const [hRaw, mRaw] = String(value ?? '').split(':')
  let h = Number(hRaw)
  let m = Number(mRaw)
  if (!Number.isFinite(h)) h = 0
  if (!Number.isFinite(m)) m = 0
  const period = h >= 12 ? 'PM' : 'AM'
  let h12 = h % 12
  if (h12 === 0) h12 = 12
  // Snap odd minutes to the nearest 5 so the select always has a match.
  const min = MINUTES.reduce((a, b) => (Math.abs(b - m) < Math.abs(a - m) ? b : a), 0)
  return { h12, min, period }
}

/** { h12, min, period } → "HH:MM" (24h). */
function toValue(h12, min, period) {
  let h = h12 % 12 // 12 → 0
  if (period === 'PM') h += 12
  return `${pad(h)}:${pad(min)}`
}

export default function TimeField12({ value, onChange, id }) {
  const { h12, min, period } = parse(value)

  const emit = (next) => onChange(toValue(next.h12 ?? h12, next.min ?? min, next.period ?? period))

  return (
    <div className="tf12" id={id}>
      <select
        className="field__input tf12__sel"
        aria-label="Hour"
        value={h12}
        onChange={(e) => emit({ h12: Number(e.target.value) })}
      >
        {HOURS12.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <span className="tf12__colon" aria-hidden="true">
        :
      </span>
      <select
        className="field__input tf12__sel"
        aria-label="Minutes"
        value={min}
        onChange={(e) => emit({ min: Number(e.target.value) })}
      >
        {MINUTES.map((m) => (
          <option key={m} value={m}>
            {pad(m)}
          </option>
        ))}
      </select>
      <select
        className="field__input tf12__sel tf12__ampm"
        aria-label="AM or PM"
        value={period}
        onChange={(e) => emit({ period: e.target.value })}
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  )
}
