import { useMemo, useState } from 'react'
import { useApp } from '../store/AppStore'
import { useToast } from '../components/Toast'
import { useConfirm } from '../components/Confirm'
import { CITIES, CATEGORIES, categoryById } from '../data/seed'
import { formatINR } from '../lib/money'
import './panel-ui.css'

const FILTERS = ['All', 'Pending', 'Approved', 'Rejected']

const cityLabel = (s) => s.district || CITIES.find((c) => c.id === s.city)?.label || s.city

const STATUS_BADGE = {
  approved: 'badge--green',
  pending: 'badge--amber',
  rejected: 'badge--red',
}

/* Edit dialog for a salon's live details. */
function SalonEditDialog({ salon, onClose, onSave }) {
  const [form, setForm] = useState({
    name: salon.name,
    category: salon.category,
    area: salon.area,
    address: salon.address,
    opens: salon.opens,
    closes: salon.closes,
    homeServiceFee: salon.homeServiceFee ?? 0,
    atSalon: salon.serviceModes.includes('salon'),
    home: salon.serviceModes.includes('home'),
  })
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const save = async () => {
    const serviceModes = [form.atSalon && 'salon', form.home && 'home'].filter(Boolean)
    if (!serviceModes.length || busy) return
    setBusy(true)
    try {
      await onSave({
        name: form.name.trim(),
        category: form.category,
        area: form.area.trim(),
        address: form.address.trim(),
        opens: form.opens,
        closes: form.closes,
        homeServiceFee: Number(form.homeServiceFee) || 0,
        serviceModes,
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="pmodal" role="presentation" onMouseDown={onClose}>
      <div className="pmodal__box" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
        <h3 className="pmodal__title">Edit {salon.name}</h3>
        <div className="pmodal__grid">
          <label className="field pmodal__full">
            <span className="field__label">Salon name</span>
            <input className="field__input" value={form.name} onChange={set('name')} />
          </label>
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
          <label className="field">
            <span className="field__label">Area / locality</span>
            <input className="field__input" value={form.area} onChange={set('area')} />
          </label>
          <label className="field pmodal__full">
            <span className="field__label">Address</span>
            <input className="field__input" value={form.address} onChange={set('address')} />
          </label>
          <label className="field">
            <span className="field__label">Opens</span>
            <input type="time" className="field__input" value={form.opens} onChange={set('opens')} />
          </label>
          <label className="field">
            <span className="field__label">Closes</span>
            <input type="time" className="field__input" value={form.closes} onChange={set('closes')} />
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
        <div className="pmodal__modes">
          <label>
            <input type="checkbox" checked={form.atSalon} onChange={set('atSalon')} /> At salon
          </label>
          <label>
            <input type="checkbox" checked={form.home} onChange={set('home')} /> Home service
          </label>
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

export default function FounderSalons() {
  const { salons, setSalonStatus, updateSalon, settings, updateSettings } = useApp()
  const { push } = useToast()
  const confirm = useConfirm()
  const [filter, setFilter] = useState('All')
  const [editing, setEditing] = useState(null)

  const saveEdit = async (changes) => {
    try {
      await updateSalon(editing, changes)
      push({ tone: 'success', title: 'Salon updated', body: changes.name })
      setEditing(null)
    } catch (err) {
      push({ tone: 'warn', title: 'Could not update', body: err.message })
    }
  }

  const toggleComingSoon = async () => {
    try {
      const s = await updateSettings({ comingSoonEnabled: !settings.comingSoonEnabled })
      push({
        tone: 'info',
        title: `"Coming soon" ${s.comingSoonEnabled ? 'on' : 'off'}`,
        body: s.comingSoonEnabled
          ? 'Areas with no live salons show a coming-soon message.'
          : 'Coming-soon message hidden.',
      })
    } catch (err) {
      push({ tone: 'warn', title: 'Could not update', body: err.message })
    }
  }

  const rows = useMemo(() => {
    if (filter === 'All') return salons
    return salons.filter((s) => s.status === filter.toLowerCase())
  }, [salons, filter])

  const decide = async (salon, approve) => {
    if (!approve) {
      // Suspending a live salon vs declining a pending one.
      const suspending = salon.status === 'approved'
      const ok = await confirm({
        title: suspending ? 'Suspend this salon?' : 'Reject this salon?',
        message: suspending
          ? `${salon.name} will be removed from the marketplace and stop taking bookings.`
          : `${salon.name} will be declined and won't appear to customers.`,
        confirmLabel: suspending ? 'Suspend' : 'Reject',
        tone: 'danger',
      })
      if (!ok) return
    }
    try {
      await setSalonStatus(salon, approve ? 'approved' : 'rejected')
      push({
        tone: approve ? 'success' : 'warn',
        title: approve ? 'Salon approved' : 'Salon declined',
        body: `${salon.name} · ${salon.area}`,
      })
    } catch (err) {
      push({ tone: 'warn', title: 'Action failed', body: err.message })
    }
  }

  return (
    <>
      <div className="p-head p-head--row">
        <div>
          <h2 className="p-head__title">Salons</h2>
          <p className="p-head__sub">Every salon on the platform and its approval status.</p>
        </div>
        <label className="cs-toggle">
          <input
            type="checkbox"
            checked={settings.comingSoonEnabled}
            onChange={toggleComingSoon}
          />
          <span>
            <span className="cs-toggle__name">&ldquo;Coming soon&rdquo; in empty areas</span>
            <span className="cs-toggle__note">
              Show a coming-soon message where no salon is live yet.
            </span>
          </span>
        </label>
      </div>

      <div className="fs-filters">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            className="chip"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="ptable-wrap">
        <table className="ptable">
          <thead>
            <tr>
              <th>Salon</th>
              <th>Type</th>
              <th>City</th>
              <th>Owner</th>
              <th>From</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id}>
                <td>
                  <div className="ptable__strong">{s.name}</div>
                  <div className="ptable__sub">{s.area}</div>
                </td>
                <td>{categoryById(s.category).label}</td>
                <td>{cityLabel(s)}</td>
                <td>{s.ownerName ?? '—'}</td>
                <td className="ptable__money">{s.from ? formatINR(s.from) : '—'}</td>
                <td>
                  <span className={`badge ${STATUS_BADGE[s.status] ?? 'badge--neutral'}`}>
                    {s.status}
                  </span>
                </td>
                <td>
                  <div className="fs-actions">
                    <button
                      type="button"
                      className="btn btn--outline btn--sm"
                      onClick={() => setEditing(s)}
                    >
                      Edit
                    </button>
                    {s.status === 'pending' ? (
                      <>
                        <button
                          type="button"
                          className="btn btn--gold btn--sm"
                          onClick={() => decide(s, true)}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="btn btn--danger btn--sm"
                          onClick={() => decide(s, false)}
                        >
                          Reject
                        </button>
                      </>
                    ) : s.status === 'approved' ? (
                      <button
                        type="button"
                        className="btn btn--danger btn--sm"
                        onClick={() => decide(s, false)}
                      >
                        Suspend
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn--ghost-gold btn--sm"
                        onClick={() => decide(s, true)}
                      >
                        Reinstate
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <SalonEditDialog salon={editing} onClose={() => setEditing(null)} onSave={saveEdit} />
      )}
    </>
  )
}
