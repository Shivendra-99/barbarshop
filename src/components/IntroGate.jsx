import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppStore'
import { useT } from '../lib/i18n'
import { BRAND } from '../data/seed'
import { load, save } from '../lib/storage'
import LogoMark from './LogoMark'
import './IntroGate.css'

/**
 * First-visit sign-in popup, docked at the bottom. Collects the phone number and
 * hands off to /login (which sends the OTP and shows the code step). "Skip for
 * now" lets the visitor browse as a guest; the choice is remembered.
 */
export default function IntroGate() {
  const { session, ready } = useApp()
  const navigate = useNavigate()
  const t = useT()
  const [dismissed, setDismissed] = useState(() => load('intro:skipped', false))
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')

  if (!ready || session || dismissed) return null

  const phoneValid = /^[6-9]\d{9}$/.test(phone)

  const skip = () => {
    save('intro:skipped', true)
    setDismissed(true)
  }

  const sendOtp = (e) => {
    e.preventDefault()
    if (!phoneValid) {
      setError(t('login.invalidPhone'))
      return
    }
    save('intro:skipped', true)
    setDismissed(true)
    navigate('/login', { state: { phone, autoSend: true } })
  }

  return (
    <div className="intro" role="presentation" onMouseDown={skip}>
      <div
        className="intro__sheet"
        role="dialog"
        aria-modal="true"
        aria-label={`Login to ${BRAND.name}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button type="button" className="intro__close" onClick={skip} aria-label="Close">
          ×
        </button>

        <LogoMark className="intro__logo" />
        <div className="intro__name">{BRAND.name}</div>
        <h2 className="intro__title">{t('login.title')}</h2>
        <p className="intro__sub">{t('login.sub')}</p>

        <form onSubmit={sendOtp} noValidate>
          <label className="field intro__field" htmlFor="intro-phone">
            <span className="field__label">{t('intro.phoneLabel')}</span>
            <div className="intro__phoneRow">
              <span className="intro__cc">🇮🇳 +91</span>
              <input
                id="intro-phone"
                className="field__input"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))
                  setError('')
                }}
                placeholder={t('intro.placeholder')}
                inputMode="numeric"
                autoComplete="tel-national"
                autoFocus
              />
            </div>
            {error && <span className="field__error">{error}</span>}
          </label>

          <button type="submit" className="intro__send" disabled={!phoneValid}>
            {t('login.sendOtp')} <span aria-hidden="true">→</span>
          </button>
        </form>

        <button type="button" className="intro__skip" onClick={skip}>
          {t('login.skip')}
        </button>
      </div>
    </div>
  )
}
