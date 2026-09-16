import { useState } from 'react'
import { CATEGORIES } from '../data/seed'
import { fileToCompressedDataUrl } from '../lib/image'
import TimeField12 from '../components/TimeField12'
import ServiceEditor from './ServiceEditor'
import './panel-ui.css'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const SLOT_LENGTHS = [15, 20, 30, 45, 60]

/**
 * Edit a salon's live details, including the owner's slot controls (interval,
 * weekly days off, one-off blocked dates). Used by both the founder (any salon)
 * and an owner (their own). `role` gates the founder-only field (category).
 */
export default function SalonEditDialog({ salon, role = 'founder', onClose, onSave }) {
  const [form, setForm] = useState({
    name: salon.name,
    category: salon.category,
    area: salon.area,
    address: salon.address,
    phone: salon.phone ?? '',
    opens: salon.opens,
    closes: salon.closes,
    homeServiceFee: salon.homeServiceFee ?? 0,
    atSalon: salon.serviceModes.includes('salon'),
    home: salon.serviceModes.includes('home'),
    slotMinutes: salon.slotMinutes ?? 30,
    capacity: salon.capacity ?? 1,
    daysOff: salon.daysOff ?? [],
    closedDates: salon.closedDates ?? [],
    photo: salon.photo ?? null,
  })
  const [newDate, setNewDate] = useState('')
  const [busy, setBusy] = useState(false)
  const [photoErr, setPhotoErr] = useState('')
  const [photoBusy, setPhotoBusy] = useState(false)

  const onPhoto = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file
    if (!file) return
    setPhotoErr('')
    setPhotoBusy(true)
    try {
      const dataUrl = await fileToCompressedDataUrl(file)
      setForm((f) => ({ ...f, photo: dataUrl }))
    } catch (err) {
      setPhotoErr(err.message)
    } finally {
      setPhotoBusy(false)
    }
  }

  const set = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const toggleDay = (d) =>
    setForm((f) => ({
      ...f,
      daysOff: f.daysOff.includes(d) ? f.daysOff.filter((x) => x !== d) : [...f.daysOff, d].sort(),
    }))

  const addClosedDate = () => {
    if (!newDate || form.closedDates.includes(newDate)) return
    setForm((f) => ({ ...f, closedDates: [...f.closedDates, newDate].sort() }))
    setNewDate('')
  }
  const removeClosedDate = (d) =>
    setForm((f) => ({ ...f, closedDates: f.closedDates.filter((x) => x !== d) }))

  const save = async () => {
    const serviceModes = [form.atSalon && 'salon', form.home && 'home'].filter(Boolean)
    if (!serviceModes.length || busy) return
    setBusy(true)
    try {
      const changes = {
        name: form.name.trim(),
        area: form.area.trim(),
        address: form.address.trim(),
        phone: form.phone.trim(),
        opens: form.opens,
        closes: form.closes,
        homeServiceFee: Number(form.homeServiceFee) || 0,
        serviceModes,
        slotMinutes: Number(form.slotMinutes),
        capacity: Math.max(1, Number(form.capacity) || 1),
        daysOff: form.daysOff,
        closedDates: form.closedDates,
        photo: form.photo ?? null,
      }
      // Category is founder-only.
      if (role === 'founder') changes.category = form.category
      await onSave(changes)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="pmodal" role="presentation" onMouseDown={onClose}>
      <div className="pmodal__box" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
        <h3 className="pmodal__title">Edit {salon.name}</h3>

        {/* Cover photo */}
        <div className="se-photo">
          <div className="se-photo__preview">
            {form.photo ? (
              <img src={form.photo} alt="Salon cover preview" />
            ) : (
              <span className="se-photo__empty">No photo — stock image is used</span>
            )}
          </div>
          <div className="se-photo__controls">
            <label className="btn btn--outline btn--sm se-photo__btn">
              {photoBusy ? 'Processing…' : form.photo ? 'Change photo' : 'Upload photo'}
              <input type="file" accept="image/*" onChange={onPhoto} hidden disabled={photoBusy} />
            </label>
            {form.photo && (
              <button
                type="button"
                className="btn btn--ghost-gold btn--sm"
                onClick={() => setForm((f) => ({ ...f, photo: null }))}
              >
                Remove
              </button>
            )}
            <span className="se-hint">JPG/PNG · auto-resized. Shown as the salon banner.</span>
            {photoErr && <span className="field__error">{photoErr}</span>}
          </div>
        </div>

        <div className="pmodal__grid">
          <label className="field pmodal__full">
            <span className="field__label">Salon name</span>
            <input className="field__input" value={form.name} onChange={set('name')} />
          </label>
          {role === 'founder' && (
            <label className="field">
              <span className="field__label">Type</span>
              <select className="field__input" value={form.category} onChange={set('category')}>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="field">
            <span className="field__label">Area / locality</span>
            <input className="field__input" value={form.area} onChange={set('area')} />
          </label>
          <label className="field pmodal__full">
            <span className="field__label">Address</span>
            <input className="field__input" value={form.address} onChange={set('address')} />
          </label>
          <label className="field pmodal__full">
            <span className="field__label">Contact number (shown to customers as “Call salon”)</span>
            <input
              className="field__input"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
              placeholder="10-digit mobile number"
            />
          </label>
          <label className="field">
            <span className="field__label">Opens</span>
            <TimeField12
              value={form.opens}
              onChange={(v) => setForm((f) => ({ ...f, opens: v }))}
            />
          </label>
          <label className="field">
            <span className="field__label">Closes</span>
            <TimeField12
              value={form.closes}
              onChange={(v) => setForm((f) => ({ ...f, closes: v }))}
            />
          </label>
          <label className="field">
            <span className="field__label">Slot length</span>
            <select className="field__input" value={form.slotMinutes} onChange={set('slotMinutes')}>
              {SLOT_LENGTHS.map((m) => (
                <option key={m} value={m}>
                  {m} min
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field__label">Chairs (per slot)</span>
            <input
              type="number"
              min="1"
              max="50"
              step="1"
              className="field__input"
              value={form.capacity}
              onChange={set('capacity')}
            />
          </label>
          <label className="field">
            <span className="field__label">Home service fee</span>
            <input
              type="number"
              min="0"
              step="50"
              className="field__input"
              value={form.homeServiceFee}
              onChange={set('homeServiceFee')}
            />
          </label>
        </div>

        {/* Weekly days off */}
        <div className="se-block">
          <span className="field__label">Weekly day off</span>
          <div className="se-days">
            {WEEKDAYS.map((label, d) => (
              <button
                key={label}
                type="button"
                className={`se-day${form.daysOff.includes(d) ? ' is-off' : ''}`}
                aria-pressed={form.daysOff.includes(d)}
                onClick={() => toggleDay(d)}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="se-hint">Highlighted days are closed — no slots offered.</span>
        </div>

        {/* One-off blocked dates */}
        <div className="se-block">
          <span className="field__label">Blocked dates (holidays)</span>
          <div className="se-dateRow">
            <input
              type="date"
              className="field__input"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
            />
            <button type="button" className="btn btn--outline btn--sm" onClick={addClosedDate}>
              Add
            </button>
          </div>
          {form.closedDates.length > 0 && (
            <div className="se-chips">
              {form.closedDates.map((d) => (
                <span key={d} className="se-chip">
                  {d}
                  <button type="button" onClick={() => removeClosedDate(d)} aria-label={`Remove ${d}`}>
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="pmodal__modes">
          <label>
            <input type="checkbox" checked={form.atSalon} onChange={set('atSalon')} /> At salon
          </label>
          <label>
            <input type="checkbox" checked={form.home} onChange={set('home')} /> Home service
          </label>
        </div>

        {/* Menu — add, edit or remove services right here. Saves immediately,
            independent of the salon-details "Save changes" button below. */}
        <div className="se-block">
          <span className="field__label">Services</span>
          <span className="se-hint">Changes to the menu are saved instantly.</span>
          <ServiceEditor salonId={salon.id} />
        </div>

        <div className="pmodal__actions">
          <button type="button" className="btn btn--outline" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn--gold" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
