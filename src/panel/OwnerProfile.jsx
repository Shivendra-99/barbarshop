import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../store/AppStore'
import { useToast } from '../components/Toast'
import { api } from '../lib/api'
import './panel-ui.css'

/**
 * Owner "My Profile": edit the display name and the customer-facing contact
 * number. The contact number is saved onto all the owner's salons, so it shows
 * to customers as a "Call salon" button after a booking is confirmed. It can
 * also be overridden per-salon from the salon dashboard's Edit dialog.
 */
export default function OwnerProfile() {
  const { session, setName, mySalons, setOwnerContact } = useApp()
  const { push } = useToast()

  const [name, setNameDraft] = useState(session?.name ?? '')
  const [nameBusy, setNameBusy] = useState(false)

  // Prefill the contact number from the first salon that already has one.
  const currentPhone = useMemo(
    () => mySalons.find((s) => s.phone)?.phone ?? '',
    [mySalons],
  )
  const [phone, setPhone] = useState(currentPhone)
  const [phoneBusy, setPhoneBusy] = useState(false)

  // Per-salon blocked customer numbers.
  const [blockedCustomers, setBlockedCustomers] = useState([])
  const [blockPhone, setBlockPhone] = useState('')
  const [blockBusy, setBlockBusy] = useState(false)

  useEffect(() => setPhone(currentPhone), [currentPhone])

  useEffect(() => {
    api
      .ownerBlockedCustomers()
      .then((r) => setBlockedCustomers(r.blockedCustomers ?? []))
      .catch(() => {})
  }, [])

  const blockCustValid = /^[6-9]\d{9}$/.test(blockPhone)

  const blockCustomer = async (e) => {
    e.preventDefault()
    if (!blockCustValid || blockBusy) return
    setBlockBusy(true)
    try {
      const r = await api.ownerBlockCustomer(blockPhone)
      setBlockedCustomers(r.blockedCustomers ?? [])
      push({ tone: 'info', title: 'Customer blocked', body: `+91 ${blockPhone}` })
      setBlockPhone('')
    } catch (err) {
      push({ tone: 'warn', title: 'Could not block', body: err.message })
    } finally {
      setBlockBusy(false)
    }
  }

  const unblockCustomer = async (p) => {
    try {
      const r = await api.ownerUnblockCustomer(p)
      setBlockedCustomers(r.blockedCustomers ?? [])
      push({ tone: 'info', title: 'Customer unblocked', body: `+91 ${p}` })
    } catch (err) {
      push({ tone: 'warn', title: 'Could not unblock', body: err.message })
    }
  }

  const nameChanged = name.trim().length > 0 && name.trim() !== session?.name
  const phoneValid = phone === '' || /^\d{10}$/.test(phone)
  const phoneChanged = phone !== currentPhone

  const saveName = async (e) => {
    e.preventDefault()
    if (!nameChanged || nameBusy) return
    setNameBusy(true)
    try {
      await setName(name.trim())
      push({ tone: 'success', title: 'Profile updated' })
    } catch (err) {
      push({ tone: 'warn', title: 'Could not update name', body: err.message })
    } finally {
      setNameBusy(false)
    }
  }

  const savePhone = async (e) => {
    e.preventDefault()
    if (!phoneValid || !phoneChanged || phoneBusy) return
    setPhoneBusy(true)
    try {
      await setOwnerContact(phone)
      push({
        tone: 'success',
        title: 'Contact number saved',
        body: phone ? `Customers will see +91 ${phone}` : 'Contact number cleared',
      })
    } catch (err) {
      push({ tone: 'warn', title: 'Could not save number', body: err.message })
    } finally {
      setPhoneBusy(false)
    }
  }

  return (
    <>
      <div className="p-head">
        <h2 className="p-head__title">My profile</h2>
        <p className="p-head__sub">Your details and the number customers can call.</p>
      </div>

      <form className="p-section" onSubmit={saveName} style={{ maxWidth: 520 }}>
        <h3 className="p-section__title">Your details</h3>

        <label className="field" htmlFor="prof-name">
          <span className="field__label">Name</span>
          <input
            id="prof-name"
            className="field__input"
            value={name}
            onChange={(e) => setNameDraft(e.target.value)}
            autoComplete="name"
          />
        </label>

        <label className="field" htmlFor="prof-login">
          <span className="field__label">Login mobile (verified)</span>
          <input
            id="prof-login"
            className="field__input"
            value={`+91 ${session?.phone ?? ''}`}
            readOnly
            tabIndex={-1}
          />
          <span className="field__hint">Verified by OTP — can’t be changed.</span>
        </label>

        <button type="submit" className="btn btn--gold btn--sm" disabled={!nameChanged || nameBusy}>
          {nameBusy ? 'Saving…' : 'Save name'}
        </button>
      </form>

      <form className="p-section" onSubmit={savePhone} style={{ maxWidth: 520 }}>
        <h3 className="p-section__title">Customer contact number</h3>
        <p className="p-empty__text" style={{ padding: 0, marginBottom: 12 }}>
          Shown to customers as a <strong>Call salon</strong> button once their booking is confirmed.
          Saved to all your salons.
        </p>

        <label className="field" htmlFor="prof-phone">
          <span className="field__label">Contact number</span>
          <input
            id="prof-phone"
            className="field__input"
            type="tel"
            inputMode="numeric"
            maxLength={10}
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="10-digit mobile number"
          />
          {!phoneValid && <span className="field__error">Enter a valid 10-digit number.</span>}
        </label>

        {mySalons.length === 0 && (
          <span className="field__hint">Add a salon first — the number applies to your salons.</span>
        )}

        <button
          type="submit"
          className="btn btn--gold btn--sm"
          disabled={!phoneValid || !phoneChanged || phoneBusy || mySalons.length === 0}
        >
          {phoneBusy ? 'Saving…' : 'Save contact number'}
        </button>
      </form>

      <div className="p-section" style={{ maxWidth: 520 }}>
        <h3 className="p-section__title">Blocked customers</h3>
        <p className="p-empty__text" style={{ padding: 0, marginBottom: 12 }}>
          Block a customer’s number from booking at your salons. They can still use the rest of
          SalonSaathi.
        </p>

        <form onSubmit={blockCustomer}>
          <label className="field" htmlFor="block-cust">
            <span className="field__label">Customer mobile number</span>
            <input
              id="block-cust"
              className="field__input"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={blockPhone}
              onChange={(e) => setBlockPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="10-digit mobile number"
            />
          </label>
          <button
            type="submit"
            className="btn btn--danger btn--sm"
            disabled={!blockCustValid || blockBusy}
          >
            {blockBusy ? 'Blocking…' : 'Block customer'}
          </button>
        </form>

        {blockedCustomers.length > 0 && (
          <ul className="blocklist" style={{ marginTop: 16 }}>
            {blockedCustomers.map((p) => (
              <li key={p} className="blocklist__row">
                <span>+91 {p}</span>
                <button
                  type="button"
                  className="btn btn--ghost-gold btn--sm"
                  onClick={() => unblockCustomer(p)}
                >
                  Unblock
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
