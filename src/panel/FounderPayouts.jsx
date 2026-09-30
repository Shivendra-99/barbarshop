import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { formatINR } from '../lib/money'
import { useToast } from '../components/Toast'
import Copy from '../components/CopyButton'
import './panel-ui.css'

const STATUS_BADGE = {
  completed: 'badge--green',
  processing: 'badge--gold',
  pending: 'badge--amber',
  rejected: 'badge--red',
}

const isOpen = (w) => w.status === 'pending' || w.status === 'processing'

const when = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
const dueLabel = (iso) =>
  new Date(iso).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
  })
const sumNet = (list) => list.reduce((sum, w) => sum + w.net, 0)

/**
 * Founder — owner payouts. Weekly ones are created automatically every Sunday
 * 9 PM (pay by Monday 9 AM); instant ones are owner requests. Pay `net` to the
 * shown UPI / bank outside the app, then mark it paid (with the UTR). Rejecting
 * returns the full amount to the owner's wallet.
 */
export default function FounderPayouts() {
  const { push } = useToast()
  const [rows, setRows] = useState(null)
  const [act, setAct] = useState(null) // { w, status } while the dialog is open
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState('weekly') // 'weekly' | 'instant' | 'history'
  const [running, setRunning] = useState(false)

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
  const weekly = open.filter((w) => w.method === 'weekly')
  const instant = open.filter((w) => w.method !== 'weekly')
  // History: settled requests, most recently settled first.
  const history = (rows?.filter((w) => !isOpen(w)) ?? []).sort(
    (a, b) => new Date(b.processedAt || b.ts) - new Date(a.processedAt || a.ts),
  )
  const paidTotal = sumNet(history.filter((w) => w.status === 'completed'))
  const shown = { weekly, instant, history }[tab]
  const isOpenTab = tab !== 'history'

  const runNow = async () => {
    if (running) return
    setRunning(true)
    try {
      const r = await api.runWeeklyPayouts()
      push({
        tone: 'success',
        title: r.created ? `${r.created} weekly payout${r.created > 1 ? 's' : ''} created` : 'Nothing new to pay',
        body: r.created
          ? `${formatINR(r.total)} to pay by ${dueLabel(r.dueBy)}.`
          : 'No owner has ₹100 or more waiting, or this already ran today.',
      })
      load()
    } catch (e) {
      push({ tone: 'warn', title: 'Could not run weekly payout', body: e.message })
    } finally {
      setRunning(false)
    }
  }

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
          Every Sunday 9 PM each owner’s balance becomes a weekly payout (4% fee): pay it by Monday 9 AM.
          Instant requests (7% fee) come in any time. Send the “Pay” amount, then mark it paid.
        </p>
      </div>

      <div className="kpis kpis--sm" style={{ marginBottom: 8 }}>
        <div className="kpi">
          <div className="kpi__label">To pay · weekly</div>
          <div className="kpi__value">{formatINR(sumNet(weekly))}</div>
          <div className="kpi__delta">{weekly.length} owner{weekly.length === 1 ? '' : 's'}</div>
        </div>
        <div className="kpi">
          <div className="kpi__label">Open requests · instant</div>
          <div className="kpi__value">{formatINR(sumNet(instant))}</div>
          <div className="kpi__delta">{instant.length} request{instant.length === 1 ? '' : 's'}</div>
        </div>
        <div className="kpi">
          <div className="kpi__label">Paid so far</div>
          <div className="kpi__value">{formatINR(paidTotal)}</div>
        </div>
      </div>

      <div className="fs-filters" role="tablist" aria-label="Payout lists">
        {[
          ['weekly', `To pay · weekly (${weekly.length})`],
          ['instant', `Open requests · instant (${instant.length})`],
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

      {tab === 'weekly' && (
        <div className="payout-card" style={{ marginTop: 12 }}>
          <div>
            <div className="ptable__strong">Runs automatically every Sunday 9 PM</div>
            <div className="ptable__sub">
              Didn’t run, or need it early? Run it now. Owners with ₹100+ and payout details are included, once a day.
            </div>
          </div>
          <button type="button" className="btn btn--outline btn--sm" onClick={runNow} disabled={running}>
            {running ? 'Running…' : 'Run weekly payout now'}
          </button>
        </div>
      )}

      <div className="p-section">
        {rows === null ? (
          <p className="p-empty__text">Loading…</p>
        ) : shown.length === 0 ? (
          <div className="p-empty">
            <h4 className="p-empty__title">
              {{ weekly: 'No weekly payouts to pay', instant: 'No instant requests', history: 'Nothing paid yet' }[tab]}
            </h4>
            <p className="p-empty__text">
              {{
                weekly: 'All caught up. Sunday 9 PM’s payouts appear here.',
                instant: 'All caught up. Owners’ instant withdrawal requests appear here.',
                history: 'Payouts you mark as paid or reject are listed here.',
              }[tab]}
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
                  {isOpenTab && <th />}
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
                      <td style={{ textTransform: 'capitalize' }}>{w.method === 'weekly' ? 'Weekly (auto)' : w.method}</td>
                      <td>
                        <span className={`badge ${STATUS_BADGE[w.status] ?? 'badge--neutral'}`}>{w.status}</span>
                        {isOpen(w) && w.dueBy && (
                          <div className="ptable__sub">
                            {new Date(w.dueBy) < new Date() && <span className="badge badge--red">Overdue</span>} Pay by{' '}
                            {dueLabel(w.dueBy)}
                          </div>
                        )}
                        {w.processedAt && (
                          <div className="ptable__sub">
                            {w.status === 'completed' ? 'Paid' : 'Settled'} {when(w.processedAt)}
                          </div>
                        )}
                        {w.utr && <div className="ptable__sub">Ref {w.utr}</div>}
                        {w.note && <div className="ptable__sub">{w.note}</div>}
                      </td>
                      {isOpenTab && (
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
