import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppStore'
import { useToast } from '../components/Toast'
import { useConfirm } from '../components/Confirm'
import AddressAutocomplete from '../components/AddressAutocomplete'
import { CATEGORIES, CITIES, cityById } from '../data/seed'
import { formatINR } from '../lib/money'
import ServiceRows from './ServiceRows'
import './panel-ui.css'
import './OwnerAddSalon.css'

const EMPTY = {
  name: '',
  category: 'mens',
  city: 'lucknow',
  area: '',
  address: '',
  opens: '10:00',
  closes: '20:00',
  atSalon: true,
  home: false,
  homeServiceFee: 200,
}

/** A single blank service row — the owner decides what to add. */
const blankRow = () => ({ name: '', amount: '', mins: '', desc: '' })

export default function OwnerAddSalon() {
  const navigate = useNavigate()
  const { submitSalon } = useApp()
  const { push } = useToast()
  const confirm = useConfirm()
  const [form, setForm] = useState(EMPTY)
  const [services, setServices] = useState(() => [blankRow()])
  const [touched, setTouched] = useState(false)

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
    name: form.name.trim().length < 3 ? 'Enter the salon name.' : '',
    area: form.area.trim().length < 2 ? 'Enter the area or locality.' : '',
    address: form.address.trim().length < 8 ? 'Enter the full address.' : '',
    modes: !form.atSalon && !form.home ? 'Choose at least one service option.' : '',
    services: cleanServices.length === 0 ? 'Add at least one service with a price.' : '',
  }
  const valid = Object.values(errors).every((x) => !x)

  const [submitting, setSubmitting] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setTouched(true)
    if (!valid || submitting) return

    const serviceModes = [form.atSalon && 'salon', form.home && 'home'].filter(Boolean)

    const ok = await confirm({
      title: 'Submit for review?',
      message: `${form.name.trim()} and its ${cleanServices.length} service${
        cleanServices.length === 1 ? '' : 's'
      } will be sent to the SalonSathi team for approval. You can edit the menu anytime after it's approved.`,
      confirmLabel: 'Submit',
    })
    if (!ok) return

    setSubmitting(true)
    try {
      const salon = await submitSalon({
        name: form.name.trim(),
        category: form.category,
        city: form.city,
        area: form.area.trim(),
        address: form.address.trim(),
        opens: form.opens,
        closes: form.closes,
        serviceModes,
        homeServiceFee: form.home ? Number(form.homeServiceFee) || 0 : 0,
        services: cleanServices,
      })

      push({
        tone: 'success',
        title: 'Salon submitted',
        body: `${salon.name} is now awaiting approval.`,
        meta: 'The founder has been notified',
      })
      navigate('/owner')
    } catch (err) {
      push({ tone: 'warn', title: 'Could not submit', body: err.message })
      setSubmitting(false)
    }
  }

  const err = (key) => touched && errors[key]

  return (
    <>
      <div className="p-head">
        <h2 className="p-head__title">Add a salon</h2>
        <p className="p-head__sub">
          Submit your salon for review. Our team approves it, usually within a day, and then it
          goes live.
        </p>
      </div>

      <form className="addForm" onSubmit={submit} noValidate>
        <div className="addForm__grid">
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

          <label className="field" htmlFor="s-city">
            <span className="field__label">City</span>
            <select id="s-city" className="field__input" value={form.city} onChange={set('city')}>
              {CITIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field" htmlFor="s-area">
            <span className="field__label">Area / locality</span>
            <input
              id="s-area"
              className="field__input"
              value={form.area}
              onChange={set('area')}
              placeholder="Gomti Nagar"
              aria-invalid={Boolean(err('area'))}
            />
            {err('area') && <span className="field__error">{errors.area}</span>}
          </label>

          <label className="field addForm__full" htmlFor="s-address">
            <span className="field__label">Full address</span>
            <AddressAutocomplete
              id="s-address"
              value={form.address}
              onChange={(v) => setForm((f) => ({ ...f, address: v }))}
              onSelect={(item) =>
                setForm((f) => (f.area.trim() ? f : { ...f, area: item.name }))
              }
              near={cityById(form.city).near}
              placeholder="Start typing your salon address…"
              ariaInvalid={Boolean(err('address'))}
            />
            {err('address') && <span className="field__error">{errors.address}</span>}
          </label>

          <label className="field" htmlFor="s-opens">
            <span className="field__label">Opens</span>
            <input id="s-opens" type="time" className="field__input" value={form.opens} onChange={set('opens')} />
          </label>

          <label className="field" htmlFor="s-closes">
            <span className="field__label">Closes</span>
            <input id="s-closes" type="time" className="field__input" value={form.closes} onChange={set('closes')} />
          </label>
        </div>

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
          <legend className="field__label">Your services</legend>
          <p className="addForm__modesHint">
            Add the services your salon offers — name, price and duration. You can change these
            anytime after approval.
          </p>
          <ServiceRows rows={services} onChange={setServices} />
          {err('services') && <span className="field__error">{errors.services}</span>}
        </fieldset>

        <div className="addForm__actions">
          <button type="button" className="btn btn--outline" onClick={() => navigate('/owner')}>
            Cancel
          </button>
          <button type="submit" className="btn btn--gold" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit for review'}
          </button>
        </div>
      </form>
    </>
  )
}
