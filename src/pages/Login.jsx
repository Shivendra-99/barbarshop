import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom'
import { useApp, SESSION_DAYS } from '../store/AppStore'
import { useToast } from '../components/Toast'
import { useT } from '../lib/i18n'
import { BRAND } from '../data/seed'
import {
  widgetConfigured,
  initWidget,
  widgetSendOtp,
  widgetVerifyOtp,
  widgetRetryOtp,
  widgetRetryWhatsapp,
} from '../lib/msg91Widget'
import LogoMark from '../components/LogoMark'
import './Login.css'

const WIDGET = widgetConfigured()

// Mirrors the MSG91 widget's Resend Configuration.
const RESEND_AFTER = 10 // seconds
const MAX_RESENDS = 2

/** Where each role lands after signing in, unless a specific page was requested. */
const HOME_FOR_ROLE = { founder: '/admin', owner: '/owner', customer: '/' }

const OTP_LENGTH = 6
const PHONE_LENGTH = 10

/** Turn raw MSG91/network errors into a clear, human message. */
function friendlyOtpError(raw) {
  const m = (raw || '').toLowerCase()
  if ((m.includes('ip') && (m.includes('block') || m.includes('blacklist'))) || m.includes('blocked')) {
    return 'Too many attempts from your network. Please wait ~15 minutes, then try again — or get the code on WhatsApp.'
  }
  if (m.includes('limit') || m.includes('too many') || m.includes('exceed') || m.includes('maximum')) {
    return 'You’ve reached the resend limit (2 codes per 15 minutes). Please wait a bit, then try again — or get the code on WhatsApp.'
  }
  return raw || 'Something went wrong. Please try again.'
}

/*
 * Wrong-code lockout for the MSG91 widget flow: the widget checks codes in the
 * browser, so our server never sees a wrong guess there. Mirror the server rule
 * (3 wrong codes → 15-minute lock) per phone in localStorage. The dev/server
 * flow is enforced by the API itself; MSG91 also rate-limits on its side.
 */
const LOCK_MAX_FAILS = 3
const LOCK_MINUTES = 15
const lockKey = (p) => `salonsathi:otpLock:${p}`
function readLock(p) {
  try {
    return JSON.parse(localStorage.getItem(lockKey(p))) || { fails: 0, until: 0 }
  } catch {
    return { fails: 0, until: 0 }
  }
}
function writeLock(p, v) {
  try {
    if (v) localStorage.setItem(lockKey(p), JSON.stringify(v))
    else localStorage.removeItem(lockKey(p))
  } catch {
    /* storage unavailable — the lock just won't persist */
  }
}
/** Minutes left on this phone's lock, or 0 when unlocked. */
function lockMinutesLeft(p) {
  const ms = readLock(p).until - Date.now()
  return ms > 0 ? Math.ceil(ms / 60000) : 0
}
const lockedText = (mins) =>
  `Login locked after ${LOCK_MAX_FAILS} wrong codes. Try again in ${mins} min.`

export default function Login() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const location = useLocation()
  const { requestOtp, verifyOtp, widgetLogin, setName: saveName } = useApp()
  const { push } = useToast()
  const t = useT()

  // Warm up the MSG91 widget once, if it's configured.
  useEffect(() => {
    if (WIDGET) initWidget().catch(() => {})
  }, [])

  const next = params.get('next') || '/'
  const [step, setStep] = useState('phone')
  const [phone, setPhone] = useState(() => location.state?.phone || '')
  const [name, setName] = useState('') // only collected for a brand-new customer
  const [newUser, setNewUser] = useState(null) // set when a first-time user needs a name
  const [code, setCode] = useState('') // dev code echoed by the API
  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(''))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [resends, setResends] = useState(0)
  const inputs = useRef([])
  const nameRef = useRef(null)
  const autoSentRef = useRef(false)

  const phoneValid = /^[6-9]\d{9}$/.test(phone)
  const otpComplete = digits.every((d) => d !== '')
  const entered = useMemo(() => digits.join(''), [digits])

  // Count the resend cooldown down to zero.
  useEffect(() => {
    if (cooldown <= 0) return undefined
    const id = window.setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => window.clearTimeout(id)
  }, [cooldown])

  const resend = async () => {
    if (cooldown > 0 || busy || resends >= MAX_RESENDS) return
    if (WIDGET && lockMinutesLeft(phone)) {
      setError(lockedText(lockMinutesLeft(phone)))
      return
    }
    setBusy(true)
    try {
      if (WIDGET) await widgetRetryOtp()
      else {
        const res = await requestOtp(phone)
        setCode(res.devCode || '')
      }
      setResends((n) => n + 1)
      setCooldown(RESEND_AFTER)
      setDigits(Array(OTP_LENGTH).fill(''))
      setError('')
      push({ title: 'Code resent', body: `New code sent to +91 ${phone}`, tone: 'info' })
      focusCell(0)
    } catch (err) {
      setError(friendlyOtpError(err.message))
    } finally {
      setBusy(false)
    }
  }

  /** Fallback: get the OTP on WhatsApp when the SMS doesn't arrive. */
  const resendWhatsapp = async () => {
    if (busy) return
    setBusy(true)
    try {
      await widgetRetryWhatsapp()
      setDigits(Array(OTP_LENGTH).fill(''))
      setError('')
      push({ title: 'Code sent on WhatsApp', body: `Check WhatsApp on +91 ${phone}`, tone: 'info' })
      focusCell(0)
    } catch (err) {
      setError(
        friendlyOtpError(err.message) === (err.message || '')
          ? 'Couldn’t send on WhatsApp right now. Please use SMS, or try again shortly.'
          : friendlyOtpError(err.message),
      )
    } finally {
      setBusy(false)
    }
  }

  const doSend = async () => {
    if (!phoneValid || busy) return
    if (WIDGET && lockMinutesLeft(phone)) {
      setError(lockedText(lockMinutesLeft(phone)))
      return
    }
    setBusy(true)
    try {
      if (WIDGET) {
        await initWidget() // ensure the widget is ready (also needed for auto-send)
        await widgetSendOtp(phone)
        setCode('') // real SMS — no code to echo
      } else {
        const res = await requestOtp(phone)
        setCode(res.devCode || '') // present only in the dev flow
      }
      setDigits(Array(OTP_LENGTH).fill(''))
      setError('')
      setStep('otp')
      setResends(0)
      setCooldown(RESEND_AFTER)
      push({ title: 'OTP sent', body: `Code sent to +91 ${phone}`, tone: 'info' })
      window.setTimeout(() => inputs.current[0]?.focus(), 60)
    } catch (err) {
      setError(friendlyOtpError(err.message))
    } finally {
      setBusy(false)
    }
  }

  const sendCode = (e) => {
    e.preventDefault()
    if (!phoneValid) {
      setError(t('login.invalidPhone'))
      return
    }
    doSend()
  }

  // Auto-send once when arriving from the intro popup with a prefilled number.
  useEffect(() => {
    if (location.state?.autoSend && !autoSentRef.current && phoneValid) {
      autoSentRef.current = true
      doSend()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const focusCell = (i) => {
    const el = inputs.current[i]
    if (el) {
      el.focus()
      el.select()
    }
  }

  /** A cell can receive several digits at once — fast typing or SMS autofill. */
  const onChange = (i, raw) => {
    const clean = (raw || '').replace(/\D/g, '')
    if (!clean) {
      setDigits((d) => d.map((v, k) => (k === i ? '' : v)))
      return
    }
    const spread = clean.slice(0, OTP_LENGTH - i).split('')
    setDigits((d) => {
      const nextDigits = d.slice()
      spread.forEach((ch, k) => {
        nextDigits[i + k] = ch
      })
      return nextDigits
    })
    focusCell(Math.min(i + spread.length, OTP_LENGTH - 1))
  }

  const onKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      e.preventDefault()
      setDigits((d) => d.map((v, k) => (k === i - 1 ? '' : v)))
      focusCell(i - 1)
    }
    if (e.key === 'ArrowLeft' && i > 0) focusCell(i - 1)
    if (e.key === 'ArrowRight' && i < OTP_LENGTH - 1) focusCell(i + 1)
  }

  const finishLogin = (user) => {
    push({
      title: `Welcome to ${BRAND.name}`,
      body:
        user.role === 'customer'
          ? `Signed in as +91 ${phone}`
          : `Signed in as ${user.name} · ${user.role}`,
      meta: `Stays signed in for ${SESSION_DAYS} days`,
      tone: 'success',
    })
    // Staff go to their dashboard; a requested `next` only applies to customers.
    const dest = user.role === 'customer' ? next : HOME_FOR_ROLE[user.role]
    navigate(dest, { replace: true })
  }

  const verify = async (e) => {
    e.preventDefault()
    if (!otpComplete || busy) return
    setBusy(true)
    try {
      if (WIDGET && lockMinutesLeft(phone)) throw new Error(lockedText(lockMinutesLeft(phone)))
      let accessToken = null
      if (WIDGET) {
        try {
          accessToken = await widgetVerifyOtp(entered)
        } catch (err) {
          // A wrong code in the widget flow: count it, lock on the 3rd.
          const fails = readLock(phone).fails + 1
          if (fails >= LOCK_MAX_FAILS) {
            writeLock(phone, { fails: 0, until: Date.now() + LOCK_MINUTES * 60000 })
            setStep('phone')
            throw new Error(lockedText(LOCK_MINUTES))
          }
          writeLock(phone, { fails, until: 0 })
          const left = LOCK_MAX_FAILS - fails
          throw new Error(
            `${err.message || 'That code is incorrect.'} ${left} attempt${left === 1 ? '' : 's'} left.`,
          )
        }
      }
      const { user, isNew } = WIDGET
        ? await widgetLogin(accessToken, phone)
        : await verifyOtp(phone, entered)
      writeLock(phone, null) // success clears any wrong-code count

      // Only a brand-new customer is asked for a name — everyone else goes straight in.
      if (isNew && user.role === 'customer') {
        setNewUser(user)
        setStep('name')
        setBusy(false)
        window.setTimeout(() => nameRef.current?.focus(), 60)
        return
      }
      finishLogin(user)
    } catch (err) {
      setError(err.message || 'That code is incorrect.')
      setDigits(Array(OTP_LENGTH).fill(''))
      focusCell(0)
      setBusy(false)
    }
  }

  const submitName = async (e) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    try {
      const finalName = name.trim()
      const user = finalName ? await saveName(finalName) : newUser
      finishLogin(user ?? newUser)
    } catch (err) {
      setError(err.message || 'Could not save your name.')
      setBusy(false)
    }
  }

  return (
    <div className="login">
      <div className="login__panel">
        <div className="login__inner">
          <Link to="/" className="login__back">
            {t('login.back')}
          </Link>

          <LogoMark className="login__logo" />
          <div className="login__brand">{BRAND.name}</div>

          {step === 'phone' ? (
            <form onSubmit={sendCode} noValidate>
              <h1 className="login__title">{t('login.title')}</h1>
              <p className="login__sub">{t('login.sub')}</p>

              <label className="field" htmlFor="login-phone">
                <span className="field__label">{t('login.mobile')}</span>
                <div className="login__phoneRow">
                  <span className="login__cc">+91</span>
                  <input
                    id="login-phone"
                    className="field__input"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value.replace(/\D/g, '').slice(0, PHONE_LENGTH))
                      setError('')
                    }}
                    placeholder="98765 43210"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    aria-describedby={error ? 'login-error' : undefined}
                    aria-invalid={Boolean(error)}
                  />
                </div>
                {error && (
                  <span className="field__error" id="login-error" role="alert">
                    {error}
                  </span>
                )}
              </label>

              <button type="submit" className="btn btn--gold btn--block" disabled={!phoneValid || busy}>
                {busy ? t('login.sending') : t('login.sendOtp')}
              </button>

              <p className="login__fine">
                By continuing you agree to our{' '}
                <Link to="/terms-and-conditions" className="login__link">
                  {t('ftr.terms')}
                </Link>{' '}
                &amp;{' '}
                <Link to="/privacy-policy" className="login__link">
                  {t('ftr.privacy')}
                </Link>
                .
              </p>
            </form>
          ) : step === 'otp' ? (
            <form onSubmit={verify} noValidate>
              <h1 className="login__title">{t('login.enterCode')}</h1>
              <p className="lede login__lede">
                {t('login.sentTo')} <strong>+91 {phone}</strong>.{' '}
                <button type="button" className="login__link" onClick={() => setStep('phone')}>
                  {t('login.change')}
                </button>
              </p>

              {/* Dev flow only — the API echoes the code when no SMS is sent.
                  With MSG91 live, `code` is empty and this hint disappears. */}
              {code && (
                <div className="login__demo">
                  Demo code: <strong>{code}</strong>
                  <span>No SMS is sent in the dev flow.</span>
                </div>
              )}

              <div
                className="login__cells"
                onPaste={(e) => {
                  const pasted = e.clipboardData.getData('text').replace(/\D/g, '')
                  if (!pasted) return
                  e.preventDefault()
                  onChange(0, pasted)
                }}
              >
                {digits.map((value, i) => (
                  <input
                    // eslint-disable-next-line react/no-array-index-key
                    key={i}
                    ref={(el) => {
                      inputs.current[i] = el
                    }}
                    className={`login__cell${value ? ' is-filled' : ''}`}
                    value={value}
                    onChange={(e) => onChange(i, e.target.value)}
                    onKeyDown={(e) => onKeyDown(i, e)}
                    onFocus={(e) => e.target.select()}
                    inputMode="numeric"
                    autoComplete={i === 0 ? 'one-time-code' : 'off'}
                    aria-label={`Digit ${i + 1} of ${OTP_LENGTH}`}
                  />
                ))}
              </div>

              {error && (
                <p className="field__error" role="alert">
                  {error}
                </p>
              )}

              <button type="submit" className="btn btn--gold btn--block" disabled={!otpComplete || busy}>
                {t('login.verify')}
              </button>

              <div className="login__resend">
                {resends >= MAX_RESENDS ? (
                  <span className="login__resendNote">
                    {t('login.didntGet')}{' '}
                    <button type="button" className="login__link" onClick={() => setStep('phone')}>
                      {t('login.changeNumber')}
                    </button>
                  </span>
                ) : cooldown > 0 ? (
                  <span className="login__resendNote">
                    {t('login.resendIn', { s: String(cooldown).padStart(2, '0') })}
                  </span>
                ) : (
                  <button
                    type="button"
                    className="login__link"
                    onClick={resend}
                    disabled={busy}
                  >
                    {t('login.resend')}
                  </button>
                )}
              </div>

              {WIDGET && (
                <button
                  type="button"
                  className="btn login__wa"
                  onClick={resendWhatsapp}
                  disabled={busy}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18">
                    <path
                      fill="currentColor"
                      d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.9 5-1.3A10 10 0 1 0 12 2Zm5.8 14.2c-.2.7-1.4 1.3-2 1.4-.5.1-1.2.1-1.9-.1-.4-.1-1-.3-1.7-.6-3-1.3-4.9-4.3-5.1-4.5-.1-.2-1.2-1.6-1.2-3 0-1.4.7-2.1 1-2.4.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.4.5-.3.3c-.2.2-.3.4-.2.6.2.4.8 1.3 1.6 2 1 .9 1.9 1.2 2.2 1.3.2.1.4.1.6-.1l.7-.9c.2-.2.4-.2.6-.1l1.9.9c.3.1.4.2.5.3.1.2.1.8-.1 1.5Z"
                    />
                  </svg>
                  {t('login.whatsapp')}
                </button>
              )}

              <p className="login__fine">{t('login.resendFine', { days: SESSION_DAYS })}</p>
            </form>
          ) : (
            <form onSubmit={submitName} noValidate>
              <h1 className="login__title">{t('login.nameTitle')}</h1>
              <p className="lede login__lede">{t('login.nameSub')}</p>

              <label className="field" htmlFor="login-name">
                <span className="field__label">{t('login.yourName')}</span>
                <input
                  id="login-name"
                  ref={nameRef}
                  className="field__input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Aarav Sharma"
                  autoComplete="name"
                  maxLength={60}
                />
              </label>

              {error && (
                <p className="field__error" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="btn btn--gold btn--block"
                disabled={busy || !name.trim()}
              >
                {busy ? t('acc.saving') : t('login.continue')}
              </button>

              <div className="login__resend">
                <button
                  type="button"
                  className="login__link"
                  onClick={() => finishLogin(newUser)}
                  disabled={busy}
                >
                  {t('login.skip')}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
