import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBooking, useResendCountdown } from '../state/BookingContext'
import { pad } from '../lib/datetime'
import { IMG_INTERIOR } from '../assets'
import './Verify.css'

export default function Verify() {
  const navigate = useNavigate()
  const { otp, otpComplete, setOtpDigit, resendCode, confirmBooking } = useBooking()
  const resendIn = useResendCountdown()
  const inputs = useRef([])

  const focusCell = (i) => {
    const el = inputs.current[i]
    if (el) {
      el.focus()
      el.select()
    }
  }

  /**
   * A cell can receive more than one digit at a time — fast typing outruns the
   * re-render that moves focus, and SMS autofill drops the whole code in at
   * once — so spread whatever arrives across the remaining cells.
   */
  const handleChange = (i, raw) => {
    const digits = (raw || '').replace(/\D/g, '')
    if (!digits) {
      setOtpDigit(i, '')
      return
    }
    const spread = digits.slice(0, otp.length - i).split('')
    spread.forEach((d, k) => setOtpDigit(i + k, d))
    focusCell(Math.min(i + spread.length, otp.length - 1))
  }

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      e.preventDefault()
      setOtpDigit(i - 1, '')
      focusCell(i - 1)
    }
    if (e.key === 'ArrowLeft' && i > 0) focusCell(i - 1)
    if (e.key === 'ArrowRight' && i < otp.length - 1) focusCell(i + 1)
  }

  /** Lets a pasted code fill every cell at once. */
  const handlePaste = (e) => {
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, otp.length)
    if (!digits) return
    e.preventDefault()
    digits.split('').forEach((d, i) => setOtpDigit(i, d))
    focusCell(Math.min(digits.length, otp.length - 1))
  }

  const submit = (e) => {
    e.preventDefault()
    if (!otpComplete) return
    confirmBooking()
    navigate('/confirmed')
  }

  return (
    <div className="verify">
      <div className="verify__aside">
        <img src={IMG_INTERIOR} alt="" aria-hidden="true" />
        <div className="verify__asideScrim" />
        <blockquote className="verify__quote">
          “Your chair is held for 10 minutes while you verify.”
        </blockquote>
      </div>

      <div className="verify__panel">
        <form className="verify__form" onSubmit={submit}>
          <div className="eyebrow eyebrow--tight">Step 04 — Verify</div>
          <h1 className="display verify__title">Enter your code</h1>
          <p className="verify__lede">
            We sent a 6-digit code to <span>+44 7700 •• 4412</span>. It expires in 10 minutes.
          </p>

          <div className="verify__cells" onPaste={handlePaste}>
            {otp.map((value, i) => (
              <input
                // eslint-disable-next-line react/no-array-index-key
                key={i}
                ref={(el) => {
                  inputs.current[i] = el
                }}
                className={`verify__cell${value ? ' is-filled' : ''}`}
                value={value}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onFocus={(e) => e.target.select()}
                inputMode="numeric"
                autoComplete={i === 0 ? 'one-time-code' : 'off'}
                aria-label={`Digit ${i + 1} of ${otp.length}`}
              />
            ))}
          </div>

          <button type="submit" className="btn btn--gold btn--block" disabled={!otpComplete}>
            Verify &amp; confirm booking
          </button>

          <div className="verify__foot">
            {resendIn > 0 ? (
              <span>Resend code in 0:{pad(resendIn)}</span>
            ) : (
              <button type="button" className="verify__link" onClick={resendCode}>
                Resend code
              </button>
            )}
            <button
              type="button"
              className="verify__link"
              onClick={() => navigate('/booking')}
            >
              Change number
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
