import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useToast } from '../components/Toast'
import './panel-ui.css'

const EMPTY = { upi: '', accountName: '', accountNumber: '', ifsc: '' }
const FIELDS = [
  { k: 'upi', label: 'UPI ID', ph: 'name@okaxis', mode: 'email' },
  { k: 'accountName', label: 'Account holder name', ph: 'As on bank passbook' },
  { k: 'accountNumber', label: 'Account number', ph: '9–18 digits', mode: 'numeric' },
  { k: 'ifsc', label: 'IFSC', ph: 'SBIN0001234' },
]

/**
 * Founder-only: view and correct a salon owner's UPI / bank details. Saving also
 * re-points the owner's open withdrawal requests (the server does that), so a
 * wrong UPI can be fixed before paying.
 */
export default function OwnerPayoutEditor({ ownerId }) {
  const { push } = useToast()
  const [form, setForm] = useState(null) // null while loading
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    api
      .ownerPayoutDetails(ownerId)
      .then(({ payout }) => {
        if (!alive) return
        setForm({ ...EMPTY, ...Object.fromEntries(Object.entries(payout).map(([k, v]) => [k, v ?? ''])) })
      })
      .catch((e) => alive && setErr(e.message || 'Could not load payout details.'))
    return () => {
      alive = false
    }
  }, [ownerId])

  const save = async () => {
    if (busy) return
    setBusy(true)
    setErr('')
    try {
      const { payout, openWithdrawalsUpdated } = await api.saveOwnerPayoutDetails(ownerId, form)
      setForm({ ...EMPTY, ...Object.fromEntries(Object.entries(payout).map(([k, v]) => [k, v ?? ''])) })
      push({
        tone: 'success',
        title: 'Payout details saved',
        body: openWithdrawalsUpdated
          ? `${openWithdrawalsUpdated} open withdrawal request${openWithdrawalsUpdated === 1 ? '' : 's'} now go${openWithdrawalsUpdated === 1 ? 'es' : ''} to these details.`
          : 'The owner has been notified.',
      })
    } catch (e) {
      setErr(e.details?.[0]?.message || e.message || 'Could not save.')
    } finally {
      setBusy(false)
    }
  }

  if (!form) return err ? <p className="field__error">{err}</p> : <p className="se-hint">Loading…</p>

  return (
    <div className="ope">
      <div className="ope__grid">
        {FIELDS.map((f) => (
          <label className="field" key={f.k}>
            <span className="field__label">{f.label}</span>
            <input
              className="field__input"
              inputMode={f.mode}
              autoComplete="off"
              value={form[f.k]}
              placeholder={f.ph}
              onChange={(e) => {
                setForm((p) => ({ ...p, [f.k]: e.target.value }))
                setErr('')
              }}
            />
          </label>
        ))}
      </div>
      {err && <p className="field__error">{err}</p>}
      <button type="button" className="btn btn--outline btn--sm" onClick={save} disabled={busy}>
        {busy ? 'Saving…' : 'Save payout details'}
      </button>
    </div>
  )
}
