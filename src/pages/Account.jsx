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
  const { session, setName, logout, myBookings, walletBalance, isFirstBooking, resetDemo } =
    useApp()
  const { city, setCity } = usePrefs()
  const { push } = useToast()
  const [draft, setDraft] = useState(session?.name ?? '')

  const expires = new Date(session.expiresAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const saveName = (e) => {
    e.preventDefault()
    setName(draft.trim() || 'Guest')
    push({ tone: 'success', title: 'Profile updated' })
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

        <label className="field" htmlFor="acc-phone">
          <span className="field__label">Mobile number</span>
          <input
            id="acc-phone"
            className="field__input"
            value={`+91 ${session.phone}`}
            readOnly
            aria-readonly="true"
          />
          <span className="field__hint">
            Signed in with OTP. Stays signed in until {expires} ({SESSION_DAYS}-day session).
          </span>
        </label>

        <button type="submit" className="btn btn--gold">
          Save changes
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
          saved.
        </p>
        <div className="panel__actions">
          <button type="button" className="btn btn--outline" onClick={signOut}>
            Log out
          </button>
          <button
            type="button"
            className="btn btn--danger"
            onClick={() => {
              resetDemo()
              navigate('/')
            }}
          >
            Reset demo data
          </button>
        </div>
        <p className="panel__text panel__text--fine">
          Reset clears all locally stored bookings, wallet balance and notifications for this
          prototype.
        </p>
      </div>
    </div>
  )
}
