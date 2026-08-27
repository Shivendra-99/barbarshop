import { addDays, toISO } from './datetime'

/** Booking slot geometry — shared by the Book page and the reschedule dialog. */

export const SLOT_STEP_MINS = 30
export const MONTHS_AHEAD = 2

export const toMins = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

const label = (mins) =>
  `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`

/** Deterministic "already booked" slots so a salon's day looks consistent. */
export function takenSlots(salonId, dateISO) {
  const seed = [...`${salonId}${dateISO}`].reduce((a, c) => a + c.charCodeAt(0), 0)
  return new Set([(seed % 6) * SLOT_STEP_MINS, ((seed % 4) + 7) * SLOT_STEP_MINS])
}

/** Slots for one day, respecting the salon's hours and the current time. */
export function slotsFor(salon, dateISO, todayISO) {
  const taken = takenSlots(salon.id, dateISO)
  const open = toMins(salon.opens)
  const close = toMins(salon.closes)
  const isToday = dateISO === todayISO
  const now = new Date()
  const nowMins = now.getHours() * 60 + now.getMinutes()

  const out = []
  for (let m = open; m + SLOT_STEP_MINS <= close; m += SLOT_STEP_MINS) {
    out.push({ label: label(m), busy: taken.has(m) || (isToday && m <= nowMins + 30) })
  }
  return out
}

/** First day that still has a free slot, so the picker never opens on a dead day. */
export function firstBookableDate(salon, today) {
  const todayISO = toISO(today)
  for (let i = 0; i < 14; i += 1) {
    const iso = toISO(addDays(today, i))
    if (slotsFor(salon, iso, todayISO).some((s) => !s.busy)) return iso
  }
  return todayISO
}
