import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp, SESSION_DAYS } from '../store/AppStore'
import { usePrefs } from '../store/Prefs'
import { useToast } from '../components/Toast'
import { CITIES } from '../data/seed'
import { formatINR } from '../lib/money'
import './Simple.css'

export default function Account() {
  const navigate = useNavigate()
  const { session, setName, logout, myBookings, walletBalance, isFirstBooking } = useApp()
  const { city, setCity } = usePrefs()
  const { push } = useToast()
  const [draft, setDraft] = useState(session?.name ?? '')
  const [saving, setSaving] = useState(false)

  const trimmed = draft.trim()
  const changed = trimmed.length > 0 && trimmed !== session?.name

  const expires = new Date(session.expiresAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const saveName = async (e) => {
    e.preventDefault()
    if (!changed || saving) return
    setSaving(true)
    try {
      await setName(trimmed)
      push({ tone: 'success', title: 'Profile updated' })
    } catch (err) {
      push({ tone: 'warn', title: 'Could not update name', body: err.message })
    } finally {
      setSaving(false)
    }
  }

  const signOut = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="shell shell--narrow simple">
      <h1 className="display simple__title">Account</h1>

      <div className="statRow">
        <div className="stat">
          <div className="stat__label">Bookings</div>
          <div className="stat__value money">{myBookings.length}</div>
        </div>
        <div className="stat">
          <div className="stat__label">Wallet</div>
          <div className="stat__value money">{formatINR(walletBalance)}</div>
        </div>
        <div className="stat">
          <div className="stat__label">First-booking offer</div>
          <div className="stat__value stat__value--sm">
            {isFirstBooking ? 'Available' : 'Used'}
          </div>
        </div>
      </div>

      <form className="panel" onSubmit={saveName}>
        <h2 className="simple__heading">Profile</h2>

        <label className="field" htmlFor="acc-name">
          <span className="field__label">Name</span>
          <input
            id="acc-name"
            className="field__input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoComplete="name"
          />
        </label>

        <div className="field">
          <span className="field__label">Mobile number</span>
          <div className="acc-lock">
            <input
              id="acc-phone"
              className="field__input acc-lock__input"
              value={`+91 ${session.phone}`}
              readOnly
              aria-readonly="true"
              tabIndex={-1}
            />
            <span className="acc-lock__badge">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M7 10V7a5 5 0 0 1 10 0v3M6 10h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Verified
            </span>
          </div>
          <span className="field__hint">
            Your number is verified by OTP and can’t be changed. Signed in until {expires} (
            {SESSION_DAYS}-day session).
          </span>
        </div>

        <button type="submit" className="btn btn--gold" disabled={!changed || saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>

      <div className="panel">
        <h2 className="simple__heading">Default city</h2>
        <div className="cityRow">
          {CITIES.map((c) => (
            <button
              key={c.id}
              type="button"
              className="chip"
              aria-pressed={city.id === c.id}
              onClick={() => setCity(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="panel panel--danger">
        <h2 className="simple__heading">Session</h2>
        <p className="panel__text">
          Logging out ends the {SESSION_DAYS}-day session on this device. Your bookings stay
          saved to your account.
        </p>
        <div className="panel__actions">
          <button type="button" className="btn btn--outline" onClick={signOut}>
            Log out
          </button>
        </div>
      </div>
    </div>
  )
}
