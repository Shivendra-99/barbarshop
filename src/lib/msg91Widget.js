/**
 * MSG91 OTP Widget loader. The widget sends + verifies the OTP in the browser
 * (MSG91 handles DLT/sender/template), then hands back a JWT access-token that
 * our backend verifies. We use `exposeMethods` so our own login UI drives it.
 *
 * Config comes from Vite env (client-safe — these are public widget values):
 *   VITE_MSG91_WIDGET_ID
 *   VITE_MSG91_TOKEN_AUTH
 */

const WIDGET_ID = import.meta.env.VITE_MSG91_WIDGET_ID
const TOKEN_AUTH = import.meta.env.VITE_MSG91_TOKEN_AUTH
const SCRIPT_SRC = 'https://verify.msg91.com/otp-provider.js'

/**
 * True when both widget values are present. Blank VITE_MSG91_WIDGET_ID to fall
 * back to the dev OTP flow (code returned in the response, no SMS credits used).
 *
 * Note: MSG91's widget uses hCaptcha, which refuses to run on "localhost" —
 * disable Captcha Validation in the MSG91 widget settings for local testing.
 */
export const widgetConfigured = () => Boolean(WIDGET_ID && TOKEN_AUTH)

let scriptPromise = null
function loadScript() {
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    if (window.initSendOTP) return resolve()
    const s = document.createElement('script')
    s.src = SCRIPT_SRC
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Could not load the OTP service.'))
    document.head.appendChild(s)
  })
  return scriptPromise
}

let initPromise = null
/** Loads the script and initialises the widget once. */
export function initWidget() {
  if (!widgetConfigured()) return Promise.reject(new Error('OTP widget not configured'))
  if (initPromise) return initPromise
  initPromise = loadScript().then(() => {
    window.initSendOTP({
      widgetId: WIDGET_ID,
      tokenAuth: TOKEN_AUTH,
      exposeMethods: true,
      success: () => {},
      failure: () => {},
    })
  })
  return initPromise
}

const readErr = (e) => (typeof e === 'string' ? e : e?.message || 'Something went wrong.')

/** Sends an OTP to a 10-digit Indian number (country code added here). */
export function widgetSendOtp(phone) {
  return new Promise((resolve, reject) => {
    window.sendOtp(
      `91${phone}`,
      (data) => resolve(data),
      (err) => reject(new Error(readErr(err))),
    )
  })
}

/** Verifies the code. Resolves with the access-token (JWT) on success. */
export function widgetVerifyOtp(code) {
  return new Promise((resolve, reject) => {
    window.verifyOtp(
      code,
      (data) => resolve(data?.message ?? data?.token ?? data),
      (err) => reject(new Error(readErr(err))),
    )
  })
}

/** Resends the OTP over the text channel. */
export function widgetRetryOtp() {
  return new Promise((resolve, reject) => {
    window.retryOtp(
      '11', // text channel
      (data) => resolve(data),
      (err) => reject(new Error(readErr(err))),
    )
  })
}
