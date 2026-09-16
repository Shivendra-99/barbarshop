import { addDays, fromISO, toISO, formatTime12, toMins } from './datetime'

export { formatTime12, toMins }

/** Booking slot geometry — shared by the Book page and the reschedule dialog. */

export const SLOT_STEP_MINS = 30
export const MONTHS_AHEAD = 2

export const label = (mins) => {
  let h = Math.floor(mins / 60)
  const m = mins % 60
  const period = h >= 12 ? 'PM' : 'AM'
  h = h % 12
  if (h === 0) h = 12
  return `${h}:${String(m).padStart(2, '0')} ${period}`
}

/** The slot interval this salon uses (owner-set), falling back to 30 min. */
const stepFor = (salon) => Number(salon?.slotMinutes) || SLOT_STEP_MINS

/**
 * Is the salon open on this date? False when the weekday is in daysOff or the
 * date is a one-off closed date (owner-set). Both are optional.
 */
export function isSalonOpenOn(salon, dateISO) {
  const daysOff = salon?.daysOff ?? []
  const closedDates = salon?.closedDates ?? []
  if (closedDates.includes(dateISO)) return false
  const weekday = fromISO(dateISO).getDay() // 0 = Sun … 6 = Sat
  return !daysOff.includes(weekday)
}

/**
 * Slots for one day, respecting the salon's hours, days off, current time and
 * real availability. `availability` = { capacity, taken: { [slotLabel]: count } }
 * from GET /bookings/availability; a slot is busy once its bookings reach the
 * salon's capacity. Called without it (e.g. firstBookableDate) it only blocks
 * past times, then the grid updates once availability loads.
 */
export function slotsFor(salon, dateISO, todayISO, availability = null) {
  if (!isSalonOpenOn(salon, dateISO)) return []

  const step = stepFor(salon)
  const capacity = availability?.capacity ?? salon?.capacity ?? 1
  const taken = availability?.taken ?? {}
  const open = toMins(salon.opens)
  const close = toMins(salon.closes)
  const isToday = dateISO === todayISO
  const now = new Date()
  const nowMins = now.getHours() * 60 + now.getMinutes()

  const out = []
  for (let m = open; m + step <= close; m += step) {
    const lbl = label(m)
    const legacy24 = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
    const takenCount = (taken[lbl] ?? 0) + (taken[legacy24] ?? 0)
    const full = takenCount >= capacity
    out.push({ label: lbl, busy: full || (isToday && m <= nowMins + 30) })
  }
  return out
}

/** First day that still has a free slot, so the picker never opens on a dead day. */
export function firstBookableDate(salon, today) {
  const todayISO = toISO(today)
  for (let i = 0; i < 60; i += 1) {
    const iso = toISO(addDays(today, i))
    if (slotsFor(salon, iso, todayISO).some((s) => !s.busy)) return iso
  }
  return todayISO
}
