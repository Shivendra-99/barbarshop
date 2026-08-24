import { useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useApp, SESSION_DAYS } from '../store/AppStore'
import { useToast } from '../components/Toast'
import { BRAND } from '../data/seed'
import { IMG_UNISEX } from '../assets'
import './Login.css'

const OTP_LENGTH = 6
const PHONE_LENGTH = 10

/** Demo-only: a real build would send this over SMS and never expose it. */
const makeCode = () => String(Math.floor(100000 + Math.random() * 899999))

export default function Login() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { login } = useApp()
  const { push } = useToast()

  const next = params.get('next') || '/'
  const [step, setStep] = useState('phone')
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(''))
  const [error, setError] = useState('')
  const inputs = useRef([])

  const phoneValid = /^[6-9]\d{9}$/.test(phone)
  const otpComplete = digits.every((d) => d !== '')
  const entered = useMemo(() => digits.join(''), [digits])

  const sendCode = (e) => {
    e.preventDefault()
    if (!phoneValid) {
      setError('Enter a valid 10-digit mobile number.')
      return
    }
    const fresh = makeCode()
    setCode(fresh)
    setDigits(Array(OTP_LENGTH).fill(''))
    setError('')
    setStep('otp')
    push({ title: 'OTP sent', body: `Code sent to +91 ${phone}`, tone: 'info' })
    window.setTimeout(() => inputs.current[0]?.focus(), 60)
  }

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

  const verify = (e) => {
    e.preventDefault()
    if (!otpComplete) return
    if (entered !== code) {
      setError('That code does not match. Check and try again.')
      setDigits(Array(OTP_LENGTH).fill(''))
      focusCell(0)
      return
    }
    login(phone, { name: name.trim() || 'Guest' })
    push({
      title: `Welcome to ${BRAND.name}`,
      body: `Signed in as +91 ${phone}`,
      meta: `Stays signed in for ${SESSION_DAYS} days`,
      tone: 'success',
    })
    navigate(next, { replace: true })
  }

  return (
    <div className="login">
      <div className="login__art" aria-hidden="true">
        <img src={IMG_UNISEX} alt="" />
        <div className="login__artScrim" />
        <blockquote className="login__quote">{BRAND.tagline}</blockquote>
      </div>

      <div className="login__panel">
        <div className="login__inner">
          <Link to="/" className="login__back">
            ← Back to home
          </Link>

          {step === 'phone' ? (
            <form onSubmit={sendCode} noValidate>
              <div className="eyebrow">Step 01 — Your number</div>
              <h1 className="display login__title">Sign in to book</h1>
              <p className="lede login__lede">
                We&rsquo;ll text you a one-time code. No password to remember.
              </p>

              <label className="field" htmlFor="login-name">
                <span className="field__label">Your name</span>
                <input
                  id="login-name"
                  className="field__input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Aarav Sharma"
                  autoComplete="name"
                />
              </label>

              <label className="field" htmlFor="login-phone">
                <span className="field__label">Mobile number</span>
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

              <button type="submit" className="btn btn--gold btn--block" disabled={!phoneValid}>
                Send OTP
              </button>

              <p className="login__fine">
                By continuing you agree to our Terms and Privacy Policy.
              </p>
            </form>
          ) : (
            <form onSubmit={verify} noValidate>
              <div className="eyebrow">Step 02 — Verify</div>
              <h1 className="display login__title">Enter your code</h1>
              <p className="lede login__lede">
                Sent to <strong>+91 {phone}</strong>.{' '}
                <button type="button" className="login__link" onClick={() => setStep('phone')}>
                  Change
                </button>
              </p>

              <div className="login__demo">
                Demo code: <strong>{code}</strong>
                <span>No SMS is actually sent in this prototype.</span>
              </div>

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

              <button type="submit" className="btn btn--gold btn--block" disabled={!otpComplete}>
                Verify &amp; continue
              </button>

              <p className="login__fine">
                Stays signed in on this device for {SESSION_DAYS} days.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
