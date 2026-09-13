import { addDays, fromISO, toISO } from './datetime'

/** Booking slot geometry — shared by the Book page and the reschedule dialog. */

export const SLOT_STEP_MINS = 30
export const MONTHS_AHEAD = 2

export const toMins = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

const label = (mins) =>
  `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`

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
    const full = (taken[lbl] ?? 0) >= capacity
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
