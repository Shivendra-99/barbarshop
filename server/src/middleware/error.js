/** An error with an HTTP status the client can act on. */
export class ApiError extends Error {
  constructor(status, message, details) {
    super(message)
    this.status = status
    this.details = details
  }
}

/** Wraps an async route so thrown errors reach the error handler. */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)

export function notFound(_req, res) {
  res.status(404).json({ error: 'Not found' })
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  const status = err.status || 500
  if (status >= 500) {
    // eslint-disable-next-line no-console
    console.error(err)
  }
  res.status(status).json({
    error: err.message || 'Something went wrong',
    ...(err.details ? { details: err.details } : {}),
  })
}
