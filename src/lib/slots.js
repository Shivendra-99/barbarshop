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

/** Deterministic "already booked" slots so a salon's day looks consistent. */
export function takenSlots(salon, dateISO) {
  const step = stepFor(salon)
  const seed = [...`${salon.id}${dateISO}`].reduce((a, c) => a + c.charCodeAt(0), 0)
  return new Set([(seed % 6) * step, ((seed % 4) + 7) * step])
}

/** Slots for one day, respecting the salon's hours, days off and current time. */
export function slotsFor(salon, dateISO, todayISO) {
  if (!isSalonOpenOn(salon, dateISO)) return []

  const step = stepFor(salon)
  const taken = takenSlots(salon, dateISO)
  const open = toMins(salon.opens)
  const close = toMins(salon.closes)
  const isToday = dateISO === todayISO
  const now = new Date()
  const nowMins = now.getHours() * 60 + now.getMinutes()

  const out = []
  for (let m = open; m + step <= close; m += step) {
    out.push({ label: label(m), busy: taken.has(m) || (isToday && m <= nowMins + 30) })
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
