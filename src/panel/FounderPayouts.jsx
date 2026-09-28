import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { formatINR } from '../lib/money'
import { useToast } from '../components/Toast'
import './panel-ui.css'

const STATUS_BADGE = {
  completed: 'badge--green',
  processing: 'badge--gold',
  pending: 'badge--amber',
  rejected: 'badge--red',
}

const isOpen = (w) => w.status === 'pending' || w.status === 'processing'

/** Small "Copy" button so UPI IDs / account numbers are pasted, never retyped. */
function Copy({ value, label }) {
  const { push } = useToast()
  const copy = async () => {
    const text = String(value)
    let ok = false
    try {
      await navigator.clipboard.writeText(text)
      ok = true
    } catch {
      // Clipboard API blocked (some phone browsers / embedded views): fall back
      // to a hidden textarea + execCommand, which works almost everywhere.
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0'
      document.body.appendChild(ta)
      ta.select()
      try {
        ok = document.execCommand('copy')
      } catch {
        ok = false
      }
      ta.remove()
    }
    push(
      ok
        ? { tone: 'success', title: `${label} copied`, body: text }
        : { tone: 'warn', title: 'Could not copy', body: 'Select the text and copy it manually.' },
    )
  }
  return (
    <button type="button" className="copybtn" onClick={copy} aria-label={`Copy ${label}`}>
      Copy
    </button>
  )
}

const when = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

/**
 * Founder — owner withdrawal requests. Pay `net` to the shown UPI / bank
 * outside the app, then mark it paid (with the UTR). Rejecting returns the
 * full amount to the owner's wallet.
 */
export default function FounderPayouts() {
  const { push } = useToast()
  const [rows, setRows] = useState(null)
  const [act, setAct] = useState(null) // { w, status } while the dialog is open
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState('open') // 'open' | 'history'

  const load = () =>
    api
      .allWithdrawals()
      .then((d) => setRows(d.withdrawals))
      .catch((e) => {
        setRows([])
        push({ tone: 'warn', title: 'Could not load payouts', body: e.message })
      })
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const open = rows?.filter(isOpen) ?? []
  const owed = open.reduce((sum, w) => sum + w.net, 0)
  // History: settled requests, most recently settled first.
  const history = (rows?.filter((w) => !isOpen(w)) ?? []).sort(
    (a, b) => new Date(b.processedAt || b.ts) - new Date(a.processedAt || a.ts),
  )
  const paidTotal = history.filter((w) => w.status === 'completed').reduce((sum, w) => sum + w.net, 0)
  const shown = tab === 'open' ? open : history

  const submit = async () => {
    if (busy) return
    setBusy(true)
    try {
      const body = act.status === 'completed' ? { status: 'completed', utr: text } : { status: 'rejected', note: text }
      await api.decideWithdrawal(act.w.id, body)
      push({ tone: 'success', title: act.status === 'completed' ? 'Marked as paid' : 'Returned to wallet' })
      setAct(null)
      load()
    } catch (e) {
      push({ tone: 'warn', title: 'Could not update', body: e.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="p-head">
        <h2 className="p-head__title">Payouts</h2>
        <p className="p-head__sub">
          Owner withdrawal requests. Send the “Pay” amount to their UPI / bank, then mark it paid.
        </p>
      </div>

      <div className="kpis kpis--sm" style={{ marginBottom: 8 }}>
        <div className="kpi">
          <div className="kpi__label">Open requests</div>
          <div className="kpi__value">{open.length}</div>
        </div>
        <div className="kpi">
          <div className="kpi__label">To pay</div>
          <div className="kpi__value">{formatINR(owed)}</div>
        </div>
        <div className="kpi">
          <div className="kpi__label">Paid so far</div>
          <div className="kpi__value">{formatINR(paidTotal)}</div>
        </div>
      </div>

      <div className="fs-filters" role="tablist" aria-label="Payout lists">
        {[
          ['open', `Pending requests (${open.length})`],
          ['history', `Paid history (${history.length})`],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            className="chip"
            aria-selected={tab === id}
            aria-pressed={tab === id}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="p-section">
        {rows === null ? (
          <p className="p-empty__text">Loading…</p>
        ) : shown.length === 0 ? (
          <div className="p-empty">
            <h4 className="p-empty__title">
              {tab === 'open' ? 'No pending requests' : 'Nothing paid yet'}
            </h4>
            <p className="p-empty__text">
              {tab === 'open'
                ? 'All caught up. New owner withdrawal requests appear here.'
                : 'Requests you mark as paid or reject are listed here.'}
            </p>
          </div>
        ) : (
          <div className="ptable-wrap">
            <table className="ptable">
              <thead>
                <tr>
                  <th>Owner</th>
                  <th>Pay</th>
                  <th>To</th>
                  <th>Method</th>
                  <th>Status</th>
                  {tab === 'open' && <th />}
                </tr>
              </thead>
              <tbody>
                {shown.map((w) => {
                  const d = w.destination ?? {}
                  return (
                    <tr key={w.id}>
                      <td>
                        <div className="ptable__strong">{w.owner?.name ?? '—'}</div>
                        <div className="ptable__sub">
                          {w.owner?.phone ? `+91 ${w.owner.phone}` : ''} · {when(w.ts)}
                        </div>
                      </td>
                      <td className="ptable__money">
                        <div className="ptable__strong">
                          {formatINR(w.net)} {isOpen(w) && <Copy value={w.net} label="Amount" />}
                        </div>
                        <div className="ptable__sub">
                          of {formatINR(w.amount)} · fee {formatINR(w.fee)}
                        </div>
                      </td>
                      <td>
                        {d.upi && (
                          <div className="ptable__strong">
                            UPI {d.upi} <Copy value={d.upi} label="UPI ID" />
                          </div>
                        )}
                        {d.accountNumber && (
                          <div className={d.upi ? 'ptable__sub' : 'ptable__strong'}>
                            <div>{d.accountName}</div>
                            <div>
                              A/c {d.accountNumber} <Copy value={d.accountNumber} label="Account number" />
                            </div>
                            <div>
                              IFSC {d.ifsc} <Copy value={d.ifsc} label="IFSC" />
                            </div>
                          </div>
                        )}
                        {!d.upi && !d.accountNumber && <span className="ptable__sub">Not provided</span>}
                      </td>
                      <td style={{ textTransform: 'capitalize' }}>{w.method}</td>
                      <td>
                        <span className={`badge ${STATUS_BADGE[w.status] ?? 'badge--neutral'}`}>{w.status}</span>
                        {w.processedAt && (
                          <div className="ptable__sub">
                            {w.status === 'completed' ? 'Paid' : 'Settled'} {when(w.processedAt)}
                          </div>
                        )}
                        {w.utr && <div className="ptable__sub">Ref {w.utr}</div>}
                        {w.note && <div className="ptable__sub">{w.note}</div>}
                      </td>
                      {tab === 'open' && (
                      <td>
                        {isOpen(w) && (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className="btn btn--gold btn--sm"
                              onClick={() => {
                                setText('')
                                setAct({ w, status: 'completed' })
                              }}
                            >
                              Mark paid
                            </button>
                            <button
                              type="button"
                              className="btn btn--outline btn--sm"
                              onClick={() => {
                                setText('')
                                setAct({ w, status: 'rejected' })
                              }}
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {act && (
        <div className="pmodal" role="presentation" onMouseDown={() => setAct(null)}>
          <div
            className="pmodal__box pmodal__box--sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="payout-act-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h3 className="pmodal__title" id="payout-act-title">
              {act.status === 'completed' ? 'Mark as paid' : 'Reject withdrawal'}
            </h3>
            <p className="pmodal__text">
              {act.status === 'completed'
                ? `Confirm you sent ${formatINR(act.w.net)} to ${act.w.owner?.name ?? 'the owner'}.`
                : `${formatINR(act.w.amount)} goes back to ${act.w.owner?.name ?? 'the owner'}'s wallet.`}
            </p>
            <label className="field">
              <span className="field__label">
                {act.status === 'completed' ? 'UTR / reference (optional)' : 'Reason (shown to the owner)'}
              </span>
              <input
                className="field__input"
                value={text}
                maxLength={act.status === 'completed' ? 64 : 300}
                onChange={(e) => setText(e.target.value)}
                autoFocus
              />
            </label>
            <div className="pmodal__actions">
              <button type="button" className="btn btn--outline" onClick={() => setAct(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={`btn ${act.status === 'completed' ? 'btn--gold' : 'btn--danger'}`}
                onClick={submit}
                disabled={busy}
              >
                {busy ? 'Saving…' : act.status === 'completed' ? 'Mark paid' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
