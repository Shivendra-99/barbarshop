import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import { env } from './config/env.js'
import { isEphemeral } from './config/db.js'
import { otpMode } from './lib/otp.js'
import authRoutes from './routes/auth.routes.js'
import salonRoutes from './routes/salons.routes.js'
import serviceRoutes from './routes/services.routes.js'
import bookingRoutes from './routes/bookings.routes.js'
import notificationRoutes from './routes/notifications.routes.js'
import walletRoutes from './routes/wallet.routes.js'
import { notFound, errorHandler } from './middleware/error.js'

export function createApp() {
  const app = express()

  // In dev the Vite preview can land on any localhost port, so allow all
  // localhost origins; in production, restrict to the configured allow-list.
  const corsOrigin = env.isProd
    ? env.corsOrigin
    : (origin, cb) => {
        if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
          return cb(null, true)
        }
        return cb(null, env.corsOrigin.includes(origin))
      }
  app.use(cors({ origin: corsOrigin, credentials: true }))
  app.use(express.json())
  if (!env.isProd) app.use(morgan('dev'))

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      db: isEphemeral() ? 'in-memory' : 'mongodb',
      otp: otpMode(),
      ts: Date.now(),
    })
  })

  app.use('/api/auth', authRoutes)
  app.use('/api/salons', salonRoutes)
  app.use('/api/services', serviceRoutes)
  app.use('/api/bookings', bookingRoutes)
  app.use('/api/notifications', notificationRoutes)
  app.use('/api/wallet', walletRoutes)

  app.use(notFound)
  app.use(errorHandler)

  return app
}
