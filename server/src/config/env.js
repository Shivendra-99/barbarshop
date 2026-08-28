import dotenv from 'dotenv'

dotenv.config()

const bool = (v, fallback) => (v == null ? fallback : v === 'true' || v === '1')
const int = (v, fallback) => (v == null || v === '' ? fallback : Number(v))

export const env = {
  port: int(process.env.PORT, 4000),
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  mongoUri: process.env.MONGODB_URI || '',

  // The one phone number that gets the founder (super-admin) role on login.
  // Set FOUNDER_PHONE to your real number in production.
  founderPhone: process.env.FOUNDER_PHONE || '9000000000',

  jwtSecret: process.env.JWT_SECRET || 'dev-only-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30d',

  otpTtlMinutes: int(process.env.OTP_TTL_MINUTES, 15),
  otpMaxAttempts: int(process.env.OTP_MAX_ATTEMPTS, 5),
  otpDevReturn: bool(process.env.OTP_DEV_RETURN, true),

  // MSG91 server OTP API. When authkey + templateId are set, real SMS is used;
  // otherwise the local dev OTP flow runs (code returned in the response).
  msg91: {
    authkey: process.env.MSG91_AUTHKEY || '',
    templateId: process.env.MSG91_TEMPLATE_ID || '',
    senderId: process.env.MSG91_SENDER_ID || '',
    otpExpiryMinutes: int(process.env.MSG91_OTP_EXPIRY_MINUTES, 15),
  },

  // Mappls (MapmyIndia) address autosuggest. Server-side OAuth credentials —
  // when both are set, /api/geo/* proxies address suggestions to Mappls.
  mappls: {
    clientId: process.env.MAPPLS_CLIENT_ID || '',
    clientSecret: process.env.MAPPLS_CLIENT_SECRET || '',
    // REST API key — used for geocoding (address/eLoc -> lat,lng).
    restKey: process.env.MAPPLS_REST_KEY || '',
  },

  isProd: process.env.NODE_ENV === 'production',
}

/** True when Mappls address autosuggest is configured. */
export const mapplsEnabled = () => Boolean(env.mappls.clientId && env.mappls.clientSecret)

/** True when MSG91 is fully configured — real SMS instead of the dev flow. */
export const msg91Enabled = () => Boolean(env.msg91.authkey && env.msg91.templateId)

/** Fail fast on a misconfigured production deploy; dev keeps sensible defaults. */
export function assertProdConfig() {
  if (!env.isProd) return
  const problems = []
  if (!env.mongoUri) problems.push('MONGODB_URI is required in production')
  if (env.jwtSecret === 'dev-only-change-me') problems.push('JWT_SECRET must be set in production')
  if (env.otpDevReturn) problems.push('OTP_DEV_RETURN must be false in production')
  if (!msg91Enabled()) problems.push('MSG91_AUTHKEY and MSG91_TEMPLATE_ID are required in production')
  if (problems.length) {
    throw new Error(`Invalid production config:\n - ${problems.join('\n - ')}`)
  }
}
