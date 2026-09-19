import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp, SESSION_DAYS } from '../store/AppStore'
import { usePrefs } from '../store/Prefs'
import { useToast } from '../components/Toast'
import { useT } from '../lib/i18n'
import { formatINR } from '../lib/money'
import { api } from '../lib/api'
import './Simple.css'

export default function Account() {
  const navigate = useNavigate()
  const { session, setName, logout, myBookings, walletBalance, isFirstBooking } = useApp()
  const { city, setCity, cities, setCityFromPincode, detectLocation, detecting } = usePrefs()
  const { push } = useToast()
  const t = useT()
  const [draft, setDraft] = useState(session?.name ?? '')
  const [saving, setSaving] = useState(false)
  const [pin, setPin] = useState('')
  const [pinBusy, setPinBusy] = useState(false)
  const [pinErr, setPinErr] = useState('')

  const applyPin = async () => {
    if (pin.length !== 6 || pinBusy) return
    setPinBusy(true)
    setPinErr('')
    try {
      const r = await api.pincode(pin)
      const c = setCityFromPincode({ district: r.district, state: r.state, pincode: r.pincode })
      push({ tone: 'success', title: t('acc.cityUpdated', { city: c.label }) })
      setPin('')
    } catch (err) {
      setPinErr(err.message || t('acc.cityPinErr'))
    } finally {
      setPinBusy(false)
    }
  }

  const useMyLocation = async () => {
    if (detecting) return
    try {
      const c = await detectLocation()
      push({ tone: 'success', title: t('acc.cityUpdated', { city: c.label }) })
    } catch (err) {
      push({ tone: 'warn', title: t('acc.cityDetectErr'), body: err.message })
    }
  }

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
      push({ tone: 'success', title: t('acc.updated') })
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
      <h1 className="display simple__title">{t('acc.title')}</h1>

      <div className="statRow">
        <div className="stat">
          <div className="stat__label">{t('acc.bookings')}</div>
          <div className="stat__value money">{myBookings.length}</div>
        </div>
        <div className="stat">
          <div className="stat__label">{t('acc.wallet')}</div>
          <div className="stat__value money">{formatINR(walletBalance)}</div>
        </div>
        <div className="stat">
          <div className="stat__label">{t('acc.firstOffer')}</div>
          <div className="stat__value stat__value--sm">
            {isFirstBooking ? t('acc.availableOffer') : t('acc.used')}
          </div>
        </div>
      </div>

      <form className="panel" onSubmit={saveName}>
        <h2 className="simple__heading">{t('acc.profile')}</h2>

        <label className="field" htmlFor="acc-name">
          <span className="field__label">{t('acc.name')}</span>
          <input
            id="acc-name"
            className="field__input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoComplete="name"
          />
        </label>

        <div className="field">
          <span className="field__label">{t('acc.mobile')}</span>
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
              {t('acc.verified')}
            </span>
          </div>
          <span className="field__hint">
            {t('acc.mobileHint', { date: expires, days: SESSION_DAYS })}
          </span>
        </div>

        <button type="submit" className="btn btn--gold" disabled={!changed || saving}>
          {saving ? t('acc.saving') : t('acc.save')}
        </button>
      </form>

      <div className="panel">
        <h2 className="simple__heading">{t('acc.defaultCity')}</h2>
        <div className="cityRow">
          {cities.map((c) => (
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

        <div className="citySet">
          <input
            className="field__input citySet__pin"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value.replace(/\D/g, '').slice(0, 6))
              setPinErr('')
            }}
            inputMode="numeric"
            placeholder={t('acc.cityPinPlaceholder')}
            aria-label={t('acc.cityPinPlaceholder')}
            onKeyDown={(e) => e.key === 'Enter' && applyPin()}
          />
          <button
            type="button"
            className="btn btn--gold btn--sm"
            onClick={applyPin}
            disabled={pin.length !== 6 || pinBusy}
          >
            {pinBusy ? t('acc.saving') : t('acc.citySet')}
          </button>
          <button
            type="button"
            className="btn btn--outline btn--sm"
            onClick={useMyLocation}
            disabled={detecting}
          >
            {detecting ? t('acc.cityDetecting') : t('acc.cityDetect')}
          </button>
        </div>
        {pinErr && <p className="field__error">{pinErr}</p>}
        <p className="panel__text panel__text--fine">{t('acc.cityHint')}</p>
      </div>

      <div className="panel panel--danger">
        <h2 className="simple__heading">{t('acc.session')}</h2>
        <p className="panel__text">{t('acc.sessionText', { days: SESSION_DAYS })}</p>
        <div className="panel__actions">
          <button type="button" className="btn btn--outline" onClick={signOut}>
            {t('acc.logout')}
          </button>
        </div>
      </div>
    </div>
  )
}
