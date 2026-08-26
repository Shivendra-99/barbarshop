import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../store/AppStore'
import { useToast } from '../components/Toast'
import { useConfirm } from '../components/Confirm'
import { api } from '../lib/api'
import { formatINR } from '../lib/money'
import './panel-ui.css'
import './OwnerServices.css'

const BLANK = { name: '', amount: '', mins: '', desc: '' }
const num = (v) => Math.round(Number(v))
const validRow = (r) => r.name.trim().length >= 2 && num(r.amount) >= 0 && num(r.mins) >= 5

/** True when the draft differs from the service it's editing. */
function isChanged(value, original) {
  if (!original) return true // add mode — always allowed when valid
  return (
    value.name.trim() !== original.name ||
    num(value.amount) !== original.amount ||
    num(value.mins) !== original.mins ||
    value.desc.trim() !== (original.desc ?? '')
  )
}

/** Labelled form for one service — shared by the add panel and inline editing. */
function ServiceForm({ value, onChange, onSubmit, onCancel, submitLabel, busy, original }) {
  const set = (key) => (e) => {
    const v = key === 'amount' || key === 'mins' ? e.target.value.replace(/\D/g, '') : e.target.value
    onChange({ ...value, [key]: v })
  }
  const changed = isChanged(value, original)
  const ok = validRow(value) && changed

  return (
    <div className="svcForm">
      <label className="field svcForm__name">
        <span className="field__label">Service name</span>
        <input
          className="field__input"
          value={value.name}
          onChange={set('name')}
          placeholder="e.g. Haircut & Styling"
          autoComplete="off"
        />
      </label>

      <label className="field">
        <span className="field__label">Price (₹)</span>
        <input
          className="field__input"
          value={value.amount}
          onChange={set('amount')}
          inputMode="numeric"
          placeholder="250"
          autoComplete="off"
        />
      </label>

      <label className="field">
        <span className="field__label">Duration (min)</span>
        <input
          className="field__input"
          value={value.mins}
          onChange={set('mins')}
          inputMode="numeric"
          placeholder="30"
          autoComplete="off"
        />
      </label>

      <label className="field svcForm__desc">
        <span className="field__label">Description (optional)</span>
        <input
          className="field__input"
          value={value.desc}
          onChange={set('desc')}
          placeholder="What the service includes"
          autoComplete="off"
        />
      </label>

      <div className="svcForm__actions">
        <button
          type="button"
          className="btn btn--gold btn--sm"
          onClick={onSubmit}
          disabled={busy || !ok}
        >
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn btn--outline btn--sm" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}

export default function OwnerServices() {
  const { mySalons } = useApp()
  const { push } = useToast()
  const confirm = useConfirm()

  const approved = useMemo(() => mySalons.filter((s) => s.status === 'approved'), [mySalons])
  const [salonId, setSalonId] = useState('')
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState(BLANK)
  const [adding, setAdding] = useState(BLANK)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!salonId && approved.length) setSalonId(approved[0].id)
  }, [approved, salonId])

  const load = (id) => {
    if (!id) return
    setLoading(true)
    api
      .salonServices(id)
      .then((res) => setServices(res.services))
      .catch(() => setServices([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load(salonId)
  }, [salonId])

  const startEdit = (s) => {
    setEditing(s.id)
    setDraft({ name: s.name, amount: String(s.amount), mins: String(s.mins), desc: s.desc ?? '' })
  }

  const saveEdit = async (id) => {
    if (!validRow(draft) || busy) return
    setBusy(true)
    try {
      await api.updateService(id, {
        name: draft.name.trim(),
        amount: num(draft.amount),
        mins: num(draft.mins),
        desc: draft.desc.trim(),
      })
      setEditing(null)
      load(salonId)
      push({ tone: 'success', title: 'Service updated', body: draft.name.trim() })
    } catch (err) {
      push({ tone: 'warn', title: 'Could not update', body: err.message })
    } finally {
      setBusy(false)
    }
  }

  const remove = async (s) => {
    if (busy) return
    const ok = await confirm({
      title: 'Remove service?',
      message: `"${s.name}" will be removed from your menu. Customers won't be able to book it.`,
      confirmLabel: 'Remove',
      tone: 'danger',
    })
    if (!ok) return
    setBusy(true)
    try {
      await api.deleteService(s.id)
      load(salonId)
      push({ tone: 'info', title: 'Service removed', body: s.name })
    } catch (err) {
      push({ tone: 'warn', title: 'Could not remove', body: err.message })
    } finally {
      setBusy(false)
    }
  }

  const addService = async () => {
    if (!validRow(adding) || busy) return
    setBusy(true)
    try {
      await api.addService({
        salonId,
        name: adding.name.trim(),
        amount: num(adding.amount),
        mins: num(adding.mins),
        desc: adding.desc.trim(),
      })
      setAdding(BLANK)
      load(salonId)
      push({ tone: 'success', title: 'Service added', body: adding.name.trim() })
    } catch (err) {
      push({ tone: 'warn', title: 'Could not add', body: err.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="p-head">
        <h2 className="p-head__title">Services</h2>
        <p className="p-head__sub">
          Add, edit or remove the services your salon offers. Changes go live immediately.
        </p>
      </div>

      {approved.length === 0 ? (
        <div className="p-empty">
          <h4 className="p-empty__title">No approved salons yet</h4>
          <p className="p-empty__text">
            You can edit a menu once a salon is approved. New salons set their initial menu on the
            add-salon form.
          </p>
          <Link to="/owner/add" className="btn btn--gold btn--sm" style={{ marginTop: 16 }}>
            + Add salon
          </Link>
        </div>
      ) : (
        <>
          {approved.length > 1 && (
            <label className="field svcMgr__salon" htmlFor="svc-salon">
              <span className="field__label">Salon</span>
              <select
                id="svc-salon"
                className="field__input"
                value={salonId}
                onChange={(e) => setSalonId(e.target.value)}
              >
                {approved.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.area}
                  </option>
                ))}
              </select>
            </label>
          )}

          {/* ---- Existing services ---- */}
          {loading ? (
            <p className="svcMgr__loading">Loading menu…</p>
          ) : services.length === 0 ? (
            <p className="svcMgr__loading">No services yet. Add your first one below.</p>
          ) : (
            <ul className="svcMgr__list">
              {services.map((s) => (
                <li key={s.id} className={`svcMgr__item${editing === s.id ? ' is-editing' : ''}`}>
                  {editing === s.id ? (
                    <ServiceForm
                      value={draft}
                      original={s}
                      onChange={setDraft}
                      onSubmit={() => saveEdit(s.id)}
                      onCancel={() => setEditing(null)}
                      submitLabel="Save"
                      busy={busy}
                    />
                  ) : (
                    <>
                      <div className="svcMgr__info">
                        <div className="svcMgr__name">{s.name}</div>
                        {s.desc && <div className="svcMgr__desc">{s.desc}</div>}
                      </div>
                      <div className="svcMgr__meta">
                        <span className="svcMgr__price money">{formatINR(s.amount)}</span>
                        <span className="svcMgr__mins">{s.mins} min</span>
                      </div>
                      <div className="svcMgr__actions">
                        <button
                          type="button"
                          className="btn btn--outline btn--sm"
                          onClick={() => startEdit(s)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn--danger btn--sm"
                          onClick={() => remove(s)}
                          disabled={busy}
                        >
                          Remove
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}

          {/* ---- Add new ---- */}
          <div className="svcMgr__add">
            <div className="svcMgr__addTitle">Add a service</div>
            <ServiceForm
              value={adding}
              onChange={setAdding}
              onSubmit={addService}
              submitLabel="Add service"
              busy={busy}
            />
          </div>
        </>
      )}
    </>
  )
}
