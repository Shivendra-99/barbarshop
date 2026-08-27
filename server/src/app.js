import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import { env } from './config/env.js'
import { connectDB, isEphemeral } from './config/db.js'
import { otpMode } from './lib/otp.js'
import authRoutes from './routes/auth.routes.js'
import userRoutes from './routes/users.routes.js'
import salonRoutes from './routes/salons.routes.js'
import serviceRoutes from './routes/services.routes.js'
import bookingRoutes from './routes/bookings.routes.js'
import notificationRoutes from './routes/notifications.routes.js'
import walletRoutes from './routes/wallet.routes.js'
import { notFound, errorHandler } from './middleware/error.js'

export function createApp() {
  const app = express()

  // Dev accepts any origin (localhost ports, hosts-file aliases, tunnels — the
  // MSG91 widget forces us off "localhost"). Production accepts the CORS_ORIGIN
  // allow-list plus any of this app's Vercel deployments (see corsAllow).
  app.use(cors({ origin: corsAllow, credentials: true }))
  app.use(express.json())
  if (!env.isProd) app.use(morgan('dev'))

  // Health endpoints — kept above the DB gate so they answer even if Mongo is
  // unreachable (useful for probing a misconfigured deploy). `/` and `/health`
  // are plain liveness checks; `/api/health` also reports DB + OTP mode.
  const health = (_req, res) =>
    res.json({
      ok: true,
      db: isEphemeral() ? 'in-memory' : 'mongodb',
      otp: otpMode(),
      ts: Date.now(),
    })
  app.get('/', health)
  app.get('/health', health)
  app.get('/api/health', health)

  // Ensure the database is connected before any data route runs. On serverless
  // (Vercel) there's no startup step that connects first, so we connect lazily
  // on the first request and reuse the connection on warm invocations.
  app.use(ensureDb)

  app.use('/api/auth', authRoutes)
  app.use('/api/users', userRoutes)
  app.use('/api/salons', salonRoutes)
  app.use('/api/services', serviceRoutes)
  app.use('/api/bookings', bookingRoutes)
  app.use('/api/notifications', notificationRoutes)
  app.use('/api/wallet', walletRoutes)

  app.use(notFound)
  app.use(errorHandler)

  return app
}

/* ------------------------------ CORS ------------------------------ */

/**
 * Allow: non-browser requests (no Origin), everything in dev, the CORS_ORIGIN
 * allow-list (your custom domains, e.g. https://salonsaathi.in), and any of
 * this app's Vercel deployments — production, git-branch, and per-deploy
 * preview URLs all live on *.vercel.app and change on every deploy, so match
 * them by suffix instead of listing each one.
 */
function corsAllow(origin, cb) {
  if (!origin || !env.isProd) return cb(null, true)
  if (env.corsOrigin.includes(origin)) return cb(null, true)
  try {
    if (new URL(origin).hostname.endsWith('.vercel.app')) return cb(null, true)
  } catch {
    /* malformed origin — fall through to reject */
  }
  return cb(null, false)
}

/* ---- Lazy DB connection (shared across warm serverless invocations) ---- */

let dbReady = null
async function ensureDb(_req, _res, next) {
  try {
    if (!dbReady) dbReady = connectDB()
    await dbReady
    next()
  } catch (err) {
    dbReady = null // let the next request retry the connection
    next(err)
  }
}

/**
 * Default export: a ready-to-serve Express app instance. Vercel's Express
 * runtime serves this directly (it is a valid `(req, res)` handler). Local dev
 * (src/index.js) uses the named `createApp` + app.listen instead.
 */
export default createApp()
