import { verifyToken } from '../lib/jwt.js'
import { User } from '../models/User.js'
import { ApiError } from './error.js'

/**
 * Requires a valid Bearer token and loads the user onto req.user.
 * Rejects with 401 if the token is missing, invalid, or the user is gone.
 */
export async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null
    if (!token) throw new ApiError(401, 'Sign in to continue.')

    let payload
    try {
      payload = verifyToken(token)
    } catch {
      throw new ApiError(401, 'Your session has expired. Please sign in again.')
    }

    const user = await User.findById(payload.sub)
    if (!user) throw new ApiError(401, 'Account not found.')

    req.user = user
    next()
  } catch (err) {
    next(err)
  }
}

/** Requires the authenticated user to hold one of the given roles. */
export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(new ApiError(401, 'Sign in to continue.'))
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'You do not have access to this.'))
    }
    return next()
  }
}
