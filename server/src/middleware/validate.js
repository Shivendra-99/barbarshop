import { ApiError } from './error.js'

/**
 * Validates req.body against a Zod schema, replacing it with the parsed result.
 * Turns Zod issues into a flat, client-friendly 400.
 */
export const validate = (schema) => (req, _res, next) => {
  const result = schema.safeParse(req.body)
  if (!result.success) {
    const details = result.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }))
    return next(new ApiError(400, 'Please check the details and try again.', details))
  }
  req.body = result.data
  return next()
}
