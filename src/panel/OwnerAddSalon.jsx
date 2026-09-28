import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppStore'
import { useToast } from '../components/Toast'
import { useConfirm } from '../components/Confirm'
import AddressAutocomplete from '../components/AddressAutocomplete'
import TimeField12 from '../components/TimeField12'
import { CATEGORIES, CITIES, normalizeCityId } from '../data/seed'
import { api } from '../lib/api'
import { formatINR } from '../lib/money'
import ServiceRows from './ServiceRows'
import {
  SETTINGS_DEFAULTS,
  settingsPayload,
  PhotoField,
  MapPinField,
  SlotSettings,
  StaffFields,
  staffProblem,
  PAYOUT_EMPTY,
  PayoutFields,
  payoutToForm,
  payoutFilled,
  payoutProblem,
} from './SalonSettingsFields'
import './panel-ui.css'
import './OwnerAddSalon.css'

const EMPTY = {
  name: '',
  category: 'mens',
  city: '',
  cityLabel: '',
  state: '',
  district: '',
  pin: '',
  ownerId: '',
  area: '',
  address: '',
  phone: '',
  addressELoc: null,
  opens: '10:00',
  closes: '20:00',
  atSalon: true,
  home: false,
  homeServiceFee: 200,
  ...SETTINGS_DEFAULTS,
}

/** A single blank service row — the owner decides what to add. */
const blankRow = () => ({ name: '', amount: '', mins: '', desc: '' })

export default function OwnerAddSalon({ asFounder = false }) {
  const navigate = useNavigate()
  const { submitSalon } = useApp()
  const { push } = useToast()
  const confirm = useConfirm()
  const [form, setForm] = useState(EMPTY)
  const [services, setServices] = useState(() => [blankRow()])
  const [touched, setTouched] = useState(false)
  const [owners, setOwners] = useState([])

  // Founder view: load the owners a salon can be assigned to.
  useEffect(() => {
    if (!asFounder) return
    api
      .owners()
      .then(({ owners: list }) => setOwners(list))
      .catch(() => {})
  }, [asFounder])

  const homeBase = asFounder ? '/admin/salons' : '/owner'

  // Payout (UPI / bank) details of the salon's owner: the signed-in owner, or
  // the owner the founder picked. Prefilled with what's already saved.
  const [payout, setPayout] = useState(PAYOUT_EMPTY)
  const [savedPayout, setSavedPayout] = useState(PAYOUT_EMPTY)
  useEffect(() => {
    let alive = true
    const load = asFounder
      ? form.ownerId
        ? api.ownerPayoutDetails(form.ownerId)
        : Promise.resolve({ payout: null })
      : api.withdrawals()
    load
      .then((r) => {
        if (!alive) return
        const p = payoutToForm(r.payout)
        setPayout(p)
        setSavedPayout(p)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [asFounder, form.ownerId])

  // PIN → city/state/district/area (India Post), so salons work in any city.
  const [pinBusy, setPinBusy] = useState(false)
  const [pinErr, setPinErr] = useState('')
  const [areaOptions, setAreaOptions] = useState([])

  const lookupPin = async (pin) => {
    setPinErr('')
    if (!/^\d{6}$/.test(pin)) return
    setPinBusy(true)
    try {
      const r = await api.pincode(pin)
      setAreaOptions(r.areas ?? [])
      setForm((f) => ({
        ...f,
        pin: r.pincode,
        state: r.state,
        district: r.district,
        city: normalizeCityId(r.district),
        cityLabel: r.district,
        area: f.area.trim() ? f.area : (r.areas?.[0] ?? ''),
      }))
    } catch (err) {
      setForm((f) => ({ ...f, city: '', cityLabel: '', state: '', district: '' }))
      setPinErr(err.message || 'PIN not found.')
    } finally {
      setPinBusy(false)
    }
  }

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((f) => ({ ...f, [key]: value }))
  }

  const cleanServices = services
    .map((s) => ({
      name: s.name.trim(),
      amount: Math.round(Number(s.amount)),
      mins: Math.round(Number(s.mins)),
      desc: s.desc.trim(),
    }))
    .filter((s) => s.name && s.amount >= 0 && s.mins >= 5)

  const errors = {
    ownerId: asFounder && !form.ownerId ? 'Choose the owner this salon belongs to.' : '',
    name: form.name.trim().length < 3 ? 'Enter the salon name.' : '',
    pin: !/^\d{6}$/.test(form.pin) || !form.city ? 'Enter a valid PIN code to set the city.' : '',
    area: form.area.trim().length < 2 ? 'Enter the area or locality.' : '',
    address: form.address.trim().length < 8 ? 'Enter the full address.' : '',
    modes: !form.atSalon && !form.home ? 'Choose at least one service option.' : '',
    services: cleanServices.length === 0 ? 'Add at least one service with a price.' : '',
    payout: payoutProblem(payout),
    staff: staffProblem(form.staff),
  }
  const valid = Object.values(errors).every((x) => !x)

  const [submitting, setSubmitting] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setTouched(true)
    if (!valid || submitting) return

    const serviceModes = [form.atSalon && 'salon', form.home && 'home'].filter(Boolean)

    const count = `${cleanServices.length} service${cleanServices.length === 1 ? '' : 's'}`
    const ownerName = owners.find((o) => o.id === form.ownerId)?.name
    const ok = await confirm({
      title: asFounder ? 'Add this salon?' : 'Submit for review?',
      message: asFounder
        ? `${form.name.trim()} and its ${count} will be added to ${ownerName ?? 'the owner'} and go live immediately.`
        : `${form.name.trim()} and its ${count} will be sent to the SalonSaathi team for approval. You can edit the menu anytime after it's approved.`,
      confirmLabel: asFounder ? 'Add salon' : 'Submit',
    })
    if (!ok) return

    setSubmitting(true)
    try {
      const salon = await submitSalon({
        name: form.name.trim(),
        category: form.category,
        city: form.city,
        state: form.state || undefined,
        district: form.district || undefined,
        pin: form.pin || undefined,
        ownerId: asFounder ? form.ownerId : undefined,
        area: form.area.trim(),
        address: form.address.trim(),
        phone: form.phone.trim() || undefined,
        addressELoc: form.addressELoc || undefined,
        opens: form.opens,
        closes: form.closes,
        serviceModes,
        homeServiceFee: form.home ? Number(form.homeServiceFee) || 0 : 0,
        ...settingsPayload(form),
        services: cleanServices,
      })

      // Save the owner's payout details if they were entered or changed.
      const payoutChanged = JSON.stringify(payout) !== JSON.stringify(savedPayout)
      if (payoutFilled(payout) && payoutChanged) {
        try {
          if (asFounder) await api.saveOwnerPayoutDetails(form.ownerId, payout)
          else await api.savePayoutDetails(payout)
        } catch (e) {
          push({
            tone: 'warn',
            title: 'Payout details not saved',
            body: `${e.details?.[0]?.message || e.message} Add them later from ${asFounder ? 'Salons → Edit' : 'Wallet'}.`,
          })
        }
      }

      push({
        tone: 'success',
        title: asFounder ? 'Salon added' : 'Salon submitted',
        body: asFounder
          ? `${salon.name} is now live and taking bookings.`
          : `${salon.name} is now awaiting approval.`,
        meta: asFounder ? 'The owner has been notified' : 'The founder has been notified',
      })
      navigate(homeBase)
    } catch (err) {
      push({ tone: 'warn', title: asFounder ? 'Could not add salon' : 'Could not submit', body: err.message })
      setSubmitting(false)
    }
  }

  const err = (key) => touched && errors[key]

  return (
    <>
      <div className="p-head">
        <h2 className="p-head__title">Add a salon</h2>
        <p className="p-head__sub">
          {asFounder
            ? 'Add a salon on behalf of an owner. It goes live immediately — no approval needed.'
            : 'Submit your salon for review. Our team approves it, usually within a day, and then it goes live.'}
        </p>
      </div>

      <form className="addForm" onSubmit={submit} noValidate>
        <fieldset className="addForm__modes">
          <legend className="field__label">Salon photo</legend>
          <PhotoField photo={form.photo} onChange={(photo) => setForm((f) => ({ ...f, photo }))} />
        </fieldset>

        <div className="addForm__grid">
          {asFounder && (
            <label className="field addForm__full" htmlFor="s-owner">
              <span className="field__label">Owner</span>
              <select
                id="s-owner"
                className="field__input"
                value={form.ownerId}
                onChange={set('ownerId')}
                aria-invalid={Boolean(err('ownerId'))}
              >
                <option value="">Select an owner…</option>
                {owners.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} · +91 {o.phone}
                  </option>
                ))}
              </select>
              {err('ownerId') ? (
                <span className="field__error">{errors.ownerId}</span>
              ) : (
                <span className="field__hint">
                  Don&rsquo;t see them? Add the owner first under Owners.
                </span>
              )}
            </label>
          )}

          <label className="field" htmlFor="s-name">
            <span className="field__label">Salon name</span>
            <input
              id="s-name"
              className="field__input"
              value={form.name}
              onChange={set('name')}
              placeholder="The Gilded Chair"
              aria-invalid={Boolean(err('name'))}
            />
            {err('name') && <span className="field__error">{errors.name}</span>}
          </label>

          <label className="field" htmlFor="s-category">
            <span className="field__label">Salon type</span>
            <select id="s-category" className="field__input" value={form.category} onChange={set('category')}>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <span className="field__hint">Service menu and pricing follow the type.</span>
          </label>

          <label className="field" htmlFor="s-pin">
            <span className="field__label">PIN code</span>
            <input
              id="s-pin"
              className="field__input"
              value={form.pin}
              onChange={(e) => {
                const pin = e.target.value.replace(/\D/g, '').slice(0, 6)
                setForm((f) => ({ ...f, pin }))
                if (pin.length === 6) lookupPin(pin)
              }}
              placeholder="226010"
              inputMode="numeric"
              aria-invalid={Boolean(err('pin'))}
            />
            {pinBusy ? (
              <span className="field__hint">Looking up…</span>
            ) : form.city ? (
              <span className="field__hint">
                {form.district}
                {form.state ? `, ${form.state}` : ''}
              </span>
            ) : (
              (err('pin') || pinErr) && (
                <span className="field__error">{pinErr || errors.pin}</span>
              )
            )}
          </label>

          <label className="field" htmlFor="s-area">
            <span className="field__label">Area / locality</span>
            <input
              id="s-area"
              className="field__input"
              value={form.area}
              onChange={set('area')}
              placeholder="Gomti Nagar"
              list="s-area-options"
              aria-invalid={Boolean(err('area'))}
            />
            <datalist id="s-area-options">
              {areaOptions.map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
            {err('area') && <span className="field__error">{errors.area}</span>}
          </label>

          <label className="field" htmlFor="s-phone">
            <span className="field__label">Contact number</span>
            <input
              id="s-phone"
              className="field__input"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={form.phone}
              onChange={(e) =>
                setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))
              }
              placeholder="10-digit mobile number"
            />
            <span className="field__hint">Shown to customers as “Call salon” after booking.</span>
          </label>

          <label className="field addForm__full" htmlFor="s-address">
            <span className="field__label">Full address</span>
            <AddressAutocomplete
              id="s-address"
              value={form.address}
              onChange={(v) => setForm((f) => ({ ...f, address: v, addressELoc: null }))}
              onSelect={(item) =>
                setForm((f) => ({
                  ...f,
                  addressELoc: item.eLoc ?? null,
                  area: f.area.trim() ? f.area : item.name,
                }))
              }
              near={CITIES.find((c) => c.id === form.city)?.near}
              placeholder="Start typing your salon address…"
              ariaInvalid={Boolean(err('address'))}
            />
            {err('address') && <span className="field__error">{errors.address}</span>}
          </label>

          <label className="field" htmlFor="s-opens">
            <span className="field__label">Opens</span>
            <TimeField12
              id="s-opens"
              value={form.opens}
              onChange={(v) => setForm((f) => ({ ...f, opens: v }))}
            />
          </label>

          <label className="field" htmlFor="s-closes">
            <span className="field__label">Closes</span>
            <TimeField12
              id="s-closes"
              value={form.closes}
              onChange={(v) => setForm((f) => ({ ...f, closes: v }))}
            />
          </label>
        </div>

        <fieldset className="addForm__modes">
          <legend className="field__label">Location &amp; booking settings</legend>
          <MapPinField
            mapPin={form.mapPin}
            onPin={(mapPin) => setForm((f) => ({ ...f, mapPin }))}
            status={
              asFounder
                ? 'Optional: if you are at the salon, pin it for an exact map location. Otherwise the address is used.'
                : 'Optional: pin it for an exact map location. Otherwise your address is used.'
            }
          />
          <SlotSettings form={form} setForm={setForm} />
        </fieldset>

        <fieldset className="addForm__modes">
          <legend className="field__label">Service options</legend>
          <p className="addForm__modesHint">You decide how customers can book — at your salon, at their home, or both.</p>

          <label className="modeToggle">
            <input type="checkbox" checked={form.atSalon} onChange={set('atSalon')} />
            <span>
              <span className="modeToggle__name">At salon</span>
              <span className="modeToggle__note">Customers visit your salon at their slot time.</span>
            </span>
          </label>

          <label className="modeToggle">
            <input type="checkbox" checked={form.home} onChange={set('home')} />
            <span>
              <span className="modeToggle__name">Home service</span>
              <span className="modeToggle__note">Your team travels to the customer.</span>
            </span>
          </label>

          {form.home && (
            <label className="field addForm__fee" htmlFor="s-fee">
              <span className="field__label">Home service travel fee</span>
              <input
                id="s-fee"
                type="number"
                min="0"
                step="50"
                className="field__input"
                value={form.homeServiceFee}
                onChange={set('homeServiceFee')}
              />
              <span className="field__hint">
                Added to the service price for home bookings — currently{' '}
                {formatINR(Number(form.homeServiceFee) || 0)}.
              </span>
            </label>
          )}

          {err('modes') && <span className="field__error">{errors.modes}</span>}
        </fieldset>

        <fieldset className="addForm__modes">
          <legend className="field__label">Your team (staff)</legend>
          <p className="addForm__modesHint">
            Add the people who work at the salon. Customers can pick their favourite when booking,
            and the same person can’t be booked twice for the same time.
          </p>
          <StaffFields
            staff={form.staff}
            chairs={form.capacity}
            onChange={(staff) => setForm((f) => ({ ...f, staff }))}
          />
          {err('staff') && <span className="field__error">{errors.staff}</span>}
        </fieldset>

        <fieldset className="addForm__modes">
          <legend className="field__label">Payout details (UPI / bank)</legend>
          <p className="addForm__modesHint">
            {asFounder
              ? 'Where this owner’s earnings are paid. Add a UPI ID, or a bank account. Optional — it can be added later.'
              : 'Where your earnings are paid. Add a UPI ID, or your bank account. Optional — you can add it later in Wallet.'}
          </p>
          {asFounder && !form.ownerId ? (
            <p className="field__hint">Choose the owner first.</p>
          ) : (
            <PayoutFields value={payout} onChange={setPayout} />
          )}
          {err('payout') && <span className="field__error">{errors.payout}</span>}
        </fieldset>

        <fieldset className="addForm__modes">
          <legend className="field__label">Your services</legend>
          <p className="addForm__modesHint">
            Add the services your salon offers — name, price and duration. You can change these
            anytime after approval.
          </p>
          <ServiceRows rows={services} onChange={setServices} />
          {err('services') && <span className="field__error">{errors.services}</span>}
        </fieldset>

        <div className="addForm__actions">
          <button type="button" className="btn btn--outline" onClick={() => navigate(homeBase)}>
            Cancel
          </button>
          <button type="submit" className="btn btn--gold" disabled={submitting}>
            {submitting
              ? asFounder
                ? 'Adding…'
                : 'Submitting…'
              : asFounder
                ? 'Add salon'
                : 'Submit for review'}
          </button>
        </div>
      </form>
    </>
  )
}
