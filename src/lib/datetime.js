export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export const DAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
]

/** Monday-first column headers. */
export const WEEKDAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export const pad = (n) => String(n).padStart(2, '0')

export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** Parses `YYYY-MM-DD` at local noon, dodging DST/timezone edge cases. */
export const fromISO = (iso) => new Date(`${iso}T12:00:00`)

export const startOfToday = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export const addDays = (date, days) => {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

/** Shops are closed on Sundays. */
export const isClosed = (date) => date.getDay() === 0

/**
 * Builds a Monday-first month grid. Leading blanks keep the first row aligned.
 * Past days are always disabled; `closedOn` marks business closing days, and
 * defaults to never — salons set their own weekly closures.
 */
export function buildCalendar(year, month, today = startOfToday(), closedOn = () => false) {
  const first = new Date(year, month, 1)
  const lead = (first.getDay() + 6) % 7
  const dayCount = new Date(year, month + 1, 0).getDate()
  const cells = []

  for (let i = 0; i < lead; i += 1) {
    cells.push({ key: `blank-${i}`, blank: true })
  }

  for (let day = 1; day <= dayCount; day += 1) {
    const date = new Date(year, month, day)
    const past = date < today
    const closed = closedOn(date)
    cells.push({
      key: toISO(date),
      iso: toISO(date),
      label: String(day),
      disabled: past || closed,
      closed,
      past,
    })
  }

  return cells
}

/** Generates bookable times from 09:00 to 19:00 at the given interval. */
export function buildSlots(intervalMinutes = 45, taken = []) {
  const slots = []
  for (let mins = 9 * 60; mins <= 19 * 60; mins += intervalMinutes) {
    const label = `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`
    slots.push({ label, busy: taken.includes(label) })
  }
  return slots
}

/** e.g. "Tuesday, 18 Aug" */
export function formatDateLabel(iso) {
  const d = fromISO(iso)
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`
}

/** e.g. "Saturday, 15 August" */
export function formatLongDate(date = new Date()) {
  return `${DAY_NAMES[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]}`
}

export const formatMonth = (year, month) => `${MONTHS[month]} ${year}`

/** Finds the next open day at least `minOffset` days out. */
export function nextOpenDay(minOffset = 3, from = startOfToday()) {
  let d = addDays(from, minOffset)
  while (isClosed(d)) d = addDays(d, 1)
  return d
}
