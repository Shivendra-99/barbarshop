/** Indian-numbering currency helpers (lakh/crore grouping). */

const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const INR_PAISE = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** ₹1,200 — whole rupees, Indian digit grouping. */
export const formatINR = (amount) => INR.format(amount)

/** ₹1,249.00 — used for totals where the booking fee adds paise. */
export const formatINRExact = (amount) =>
  Number.isInteger(amount) ? INR.format(amount) : INR_PAISE.format(amount)

/** ₹78,400 → "₹78.4K" for dense dashboard tiles. */
export function formatCompactINR(amount) {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`
  return INR.format(amount)
}
