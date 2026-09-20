import { useEffect, useState } from 'react'
import { useApp } from '../store/AppStore'
import { useToast } from '../components/Toast'
import { api } from '../lib/api'
import { formatINR } from '../lib/money'
import './panel-ui.css'
import './Coupons.css'

/**
 * Coupon management — shared by owner and founder. A founder creates
 * platform-wide codes (valid at every salon); an owner creates codes scoped to
 * their own salon (the server enforces the scope). Coupons apply to online
 * bookings only and never stack with the salon offer / first-booking discount.
 */
const BLANK = {
  code: '',
  type: 'percent',
  value: '',
  maxDiscount: '',
  minOrder: '',
  usageLimit: '',
  perUserLimit: '1',
  validTo: '',
  description: '',
}

/** Real, at-a-glance state — disabled/expired/exhausted are distinct from active. */
function statusOf(c) {
  if (!c.active) return { label: 'Disabled', cls: 'badge--neutral' }
  if (c.validTo && Date.now() > new Date(c.validTo).getTime()) {
    return { label: 'Expired', cls: 'badge--amber' }
  }
  if (c.usageLimit && c.usedCount >= c.usageLimit) {
    return { label: 'Fully used', cls: 'badge--amber' }
  }
  return { label: 'Active', cls: 'badge--green' }
}

export default function Coupons() {
  const { session } = useApp()
  const { push } = useToast()
  const isFounder = session?.role === 'founder'

  const [coupons, setCoupons] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const load = () =>
    api
      .coupons()
      .then((r) => setCoupons(r.coupons))
      .catch(() => setCoupons([]))
      .finally(() => setLoaded(true))
  useEffect(load, [])

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }))
    setErr('')
  }

  const submit = async () => {
    if (busy) return
    const code = form.code.trim().toUpperCase()
    const value = Number(form.value)
    if (code.length < 3) return setErr('Enter a code of at least 3 characters.')
    if (!value || value < 1) return setErr('Enter a discount value.')
    if (form.type === 'percent' && value > 90) return setErr('A percentage coupon must be 90% or less.')

    setBusy(true)
    setErr('')
    try {
      await api.createCoupon({
        code,
        type: form.type,
        value,
        maxDiscount: form.type === 'percent' && form.maxDiscount ? Number(form.maxDiscount) : 0,
        minOrder: form.minOrder ? Number(form.minOrder) : 0,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : 0,
        perUserLimit: form.perUserLimit === '' ? 1 : Number(form.perUserLimit),
        validTo: form.validTo || null,
        description: form.description.trim(),
      })
      push({ tone: 'success', title: `Coupon ${code} created` })
      setOpen(false)
      setForm(BLANK)
      load()
    } catch (e) {
      setErr(e.message || 'Could not create the coupon.')
    } finally {
      setBusy(false)
    }
  }

  const toggle = async (c) => {
    try {
      await api.updateCoupon(c.id, { active: !c.active })
      load()
    } catch (e) {
      push({ tone: 'warn', title: 'Could not update coupon', body: e.message })
    }
  }

  const remove = async (c) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Delete coupon ${c.code}? This cannot be undone.`)) return
    try {
      await api.deleteCoupon(c.id)
      push({ tone: 'success', title: `Coupon ${c.code} deleted` })
      load()
    } catch (e) {
      push({ tone: 'warn', title: 'Could not delete coupon', body: e.message })
    }
  }

  const valueLabel = (c) =>
    c.type === 'percent'
      ? `${c.value}% off${c.maxDiscount ? ` · up to ${formatINR(c.maxDiscount)}` : ''}`
      : `${formatINR(c.value)} off`

  // Live customer-eye preview of the form being filled in.
  const previewValue =
    form.type === 'percent'
      ? `${form.value || '0'}% off${form.maxDiscount ? ` up to ${formatINR(Number(form.maxDiscount))}` : ''}`
      : `${formatINR(Number(form.value) || 0)} off`

  return (
    <>
      <div className="p-head">
        <h2 className="p-head__title">Coupons</h2>
        <p className="p-head__sub">
          {isFounder
            ? 'Platform-wide discount codes, valid at every salon. Online bookings only.'
            : 'Discount codes for your salon. Online bookings only; they never stack with other offers.'}
        </p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <button
          type="button"
          className="btn btn--gold btn--sm"
          onClick={() => {
            setForm(BLANK)
            setErr('')
            setOpen(true)
          }}
        >
          + New coupon
        </button>
      </div>

      {loaded && coupons.length === 0 ? (
        <div className="p-empty">
          <h4 className="p-empty__title">No coupons yet</h4>
          <p className="p-empty__text">
            Create a code like <strong>FIRST100</strong> to give customers a discount at checkout.
          </p>
        </div>
      ) : (
        <div className="ptable-wrap">
          <table className="ptable">
            <thead>
              <tr>
                <th>Code</th>
                <th>Discount</th>
                <th>Min order</th>
                <th>Usage</th>
                {isFounder && <th>Scope</th>}
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => {
                const st = statusOf(c)
                const pct = c.usageLimit ? Math.min(100, Math.round((c.usedCount / c.usageLimit) * 100)) : 0
                return (
                  <tr key={c.id}>
                    <td>
                      <div className="ptable__strong">{c.code}</div>
                      {c.description && <div className="ptable__sub">{c.description}</div>}
                    </td>
                    <td>{valueLabel(c)}</td>
                    <td className="ptable__money">{c.minOrder ? formatINR(c.minOrder) : '—'}</td>
                    <td>
                      {c.usageLimit ? (
                        <div className="cpn-usage">
                          <span className="cpn-usage__num">
                            {c.usedCount} / {c.usageLimit}
                          </span>
                          <span className="cpn-meter">
                            <span
                              className={`cpn-meter__fill${pct >= 100 ? ' is-full' : ''}`}
                              style={{ width: `${pct}%` }}
                            />
                          </span>
                        </div>
                      ) : (
                        <span className="cpn-usage__num">{c.usedCount} used</span>
                      )}
                    </td>
                    {isFounder && <td>{c.salonId ? 'Salon' : 'Platform'}</td>}
                    <td>
                      <span className={`badge ${st.cls}`}>{st.label}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn--outline btn--sm" onClick={() => toggle(c)}>
                          {c.active ? 'Disable' : 'Enable'}
                        </button>
                        <button type="button" className="btn btn--outline btn--sm" onClick={() => remove(c)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <div className="pmodal" role="presentation" onMouseDown={() => !busy && setOpen(false)}>
          <div
            className="pmodal__box"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cpn-modal-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h3 className="pmodal__title" id="cpn-modal-title">
              New coupon
            </h3>

            {/* Code & type */}
            <fieldset className="cpn-section">
              <legend className="cpn-section__title">Code &amp; type</legend>
              <label className="field">
                <span className="field__label">Code</span>
                <input
                  className="field__input"
                  value={form.code}
                  onChange={(e) => {
                    setForm((f) => ({
                      ...f,
                      code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 24),
                    }))
                    setErr('')
                  }}
                  placeholder="FIRST100"
                  autoFocus
                />
              </label>
              <div className="field">
                <span className="field__label">Type</span>
                <div className="cpn-typeToggle">
                  {[
                    { id: 'percent', label: 'Percentage' },
                    { id: 'flat', label: 'Flat ₹' },
                  ].map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      className={`btn btn--sm ${form.type === o.id ? 'btn--gold' : 'btn--outline'}`}
                      onClick={() => setForm((f) => ({ ...f, type: o.id }))}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            </fieldset>

            {/* Discount */}
            <fieldset className="cpn-section">
              <legend className="cpn-section__title">Discount</legend>
              <div className="cpn-grid">
                <label className="field">
                  <span className="field__label">{form.type === 'percent' ? 'Discount %' : 'Amount off (₹)'}</span>
                  <input type="number" min="1" className="field__input" value={form.value} onChange={set('value')} />
                </label>
                {form.type === 'percent' && (
                  <label className="field">
                    <span className="field__label">Max discount (₹)</span>
                    <input
                      type="number"
                      min="0"
                      className="field__input"
                      value={form.maxDiscount}
                      onChange={set('maxDiscount')}
                      placeholder="No cap"
                    />
                  </label>
                )}
                <label className="field">
                  <span className="field__label">Minimum order (₹)</span>
                  <input type="number" min="0" className="field__input" value={form.minOrder} onChange={set('minOrder')} placeholder="0" />
                </label>
              </div>
            </fieldset>

            {/* Limits & validity */}
            <fieldset className="cpn-section">
              <legend className="cpn-section__title">Limits &amp; validity</legend>
              <div className="cpn-grid">
                <label className="field">
                  <span className="field__label">Total usage limit</span>
                  <input type="number" min="0" className="field__input" value={form.usageLimit} onChange={set('usageLimit')} placeholder="Unlimited" />
                </label>
                <label className="field">
                  <span className="field__label">Per-customer limit</span>
                  <input type="number" min="0" className="field__input" value={form.perUserLimit} onChange={set('perUserLimit')} placeholder="1" />
                </label>
                <label className="field">
                  <span className="field__label">Valid until</span>
                  <input type="date" className="field__input" value={form.validTo} onChange={set('validTo')} />
                </label>
                <label className="field">
                  <span className="field__label">Description</span>
                  <input className="field__input" value={form.description} onChange={set('description')} placeholder="New customer offer" maxLength={120} />
                </label>
              </div>
            </fieldset>

            {/* Live customer-eye preview */}
            <div className="cpn-preview">
              <p className="cpn-preview__label">Customers will see</p>
              <div className="cpn-preview__row">
                <span className="cpn-preview__chip">{form.code || 'CODE'}</span>
                <span className="cpn-preview__terms">{previewValue}</span>
              </div>
              <p className="cpn-preview__meta">
                {form.minOrder ? `Minimum order ${formatINR(Number(form.minOrder))} · ` : ''}
                Online payments only · doesn’t stack with other offers
              </p>
            </div>

            {err && <p className="field__error">{err}</p>}

            <div className="pmodal__actions">
              <button type="button" className="btn btn--outline" onClick={() => setOpen(false)} disabled={busy}>
                Cancel
              </button>
              <button type="button" className="btn btn--gold" onClick={submit} disabled={busy}>
                {busy ? 'Creating…' : 'Create coupon'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
