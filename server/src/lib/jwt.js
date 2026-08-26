import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

export function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role, phone: user.phone },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn },
  )
}

export function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret)
}
