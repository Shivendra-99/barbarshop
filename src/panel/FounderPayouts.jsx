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

  const open = rows?.filter((w) => w.status === 'pending' || w.status === 'processing') ?? []
  const owed = open.reduce((sum, w) => sum + w.net, 0)

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
      </div>

      <div className="p-section">
        {rows === null ? (
          <p className="p-empty__text">Loading…</p>
        ) : rows.length === 0 ? (
          <div className="p-empty">
            <h4 className="p-empty__title">No withdrawal requests yet</h4>
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
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((w) => {
                  const d = w.destination ?? {}
                  const isOpen = w.status === 'pending' || w.status === 'processing'
                  return (
                    <tr key={w.id}>
                      <td>
                        <div className="ptable__strong">{w.owner?.name ?? '—'}</div>
                        <div className="ptable__sub">
                          {w.owner?.phone ? `+91 ${w.owner.phone}` : ''} · {when(w.ts)}
                        </div>
                      </td>
                      <td className="ptable__money">
                        <div className="ptable__strong">{formatINR(w.net)}</div>
                        <div className="ptable__sub">
                          of {formatINR(w.amount)} · fee {formatINR(w.fee)}
                        </div>
                      </td>
                      <td>
                        {d.upi && <div className="ptable__strong">UPI {d.upi}</div>}
                        {d.accountNumber && (
                          <div className={d.upi ? 'ptable__sub' : 'ptable__strong'}>
                            {d.accountName} · {d.accountNumber} · {d.ifsc}
                          </div>
                        )}
                        {!d.upi && !d.accountNumber && <span className="ptable__sub">Not provided</span>}
                      </td>
                      <td style={{ textTransform: 'capitalize' }}>{w.method}</td>
                      <td>
                        <span className={`badge ${STATUS_BADGE[w.status] ?? 'badge--neutral'}`}>{w.status}</span>
                        {w.utr && <div className="ptable__sub">Ref {w.utr}</div>}
                        {w.note && <div className="ptable__sub">{w.note}</div>}
                      </td>
                      <td>
                        {isOpen && (
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
