const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

/** ₹1,200 — whole rupees, Indian digit grouping. */
export const formatINR = (amount) => INR.format(amount)
