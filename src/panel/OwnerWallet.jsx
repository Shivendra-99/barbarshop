import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../store/AppStore'
import { useToast } from '../components/Toast'
import { api } from '../lib/api'
import { formatINR } from '../lib/money'
import './panel-ui.css'

const MIN = 500
const INSTANT_FEE = 0.07

const STATUS_BADGE = {
  completed: 'badge--green',
  processing: 'badge--gold',
  pending: 'badge--amber',
  rejected: 'badge--red',
}

/**
 * Owner Wallet — real withdrawable balance (credited when online bookings are
 * completed) plus withdrawal requests and history.
 */
export default function OwnerWallet() {
  const { mySalons } = useApp()
  const { push } = useToast()
  const [data, setData] = useState(null) // { balance, min, instantFeeRate, withdrawals }
  const [ledger, setLedger] = useState([])
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('weekly')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const load = () => {
    api.withdrawals().then(setData).catch(() => setData(null))
    api.wallet().then((w) => setLedger(w.ledger)).catch(() => {})
  }
  useEffect(load, [])

  const balance = data?.balance ?? 0
  const amt = Number(amount) || 0
  const fee = method === 'instant' ? Math.round(amt * INSTANT_FEE) : 0
  const net = amt - fee
  const valid = amt >= MIN && amt <= balance

  const submit = async () => {
    if (!valid || busy) return
    setBusy(true)
    setErr('')
    try {
      await api.requestWithdrawal(amt, method)
      push({
        tone: 'success',
        title: 'Withdrawal requested',
        body: method === 'instant' ? `${formatINR(net)} (7% fee)` : `${formatINR(net)} · this Sunday`,
      })
      setOpen(false)
      setAmount('')
      load()
    } catch (e) {
      setErr(e.message || 'Could not request withdrawal.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="p-head">
        <h2 className="p-head__title">Wallet</h2>
        <p className="p-head__sub">Your withdrawable earnings from completed online bookings.</p>
      </div>

      {mySalons.length === 0 ? (
        <div className="p-empty">
          <h4 className="p-empty__title">No salons yet</h4>
          <p className="p-empty__text">Add a salon to start earning — your wallet will fill up here.</p>
          <Link to="/owner/add" className="btn btn--gold btn--sm" style={{ marginTop: 16 }}>
            + Add salon
          </Link>
        </div>
      ) : (
        <>
          <div className="wallet-hero">
            <div className="wallet-hero__label">Available balance</div>
            <div className="wallet-hero__value">{formatINR(balance)}</div>
            <div className="wallet-hero__sub">
              Cash bookings are collected at the salon and aren’t part of this balance.
            </div>
            <button
              type="button"
              className="wallet-hero__btn"
              onClick={() => {
                setErr('')
                setAmount('')
                setOpen(true)
              }}
              disabled={balance < MIN}
            >
              {balance < MIN ? `Minimum ${formatINR(MIN)} to withdraw` : 'Withdraw'}
            </button>
          </div>

          {/* Rules */}
          <div className="kpis kpis--sm" style={{ marginBottom: 8 }}>
            <div className="kpi">
              <div className="kpi__label">Minimum</div>
              <div className="kpi__value">{formatINR(MIN)}</div>
              <div className="kpi__delta">Per withdrawal</div>
            </div>
            <div className="kpi">
              <div className="kpi__label">Instant</div>
              <div className="kpi__value">7%</div>
              <div className="kpi__delta">Any time · fee</div>
            </div>
            <div className="kpi">
              <div className="kpi__label">Weekly</div>
              <div className="kpi__value">0%</div>
              <div className="kpi__delta">Every Sunday</div>
            </div>
          </div>

          {/* Withdrawals */}
          <div className="p-section">
            <h3 className="p-section__title">Withdrawals</h3>
            {!data?.withdrawals?.length ? (
              <div className="p-empty">
                <h4 className="p-empty__title">No withdrawals yet</h4>
                <p className="p-empty__text">Request a withdrawal once your balance reaches {formatINR(MIN)}.</p>
              </div>
            ) : (
              <div className="ptable-wrap">
                <table className="ptable">
                  <thead>
                    <tr>
                      <th>Amount</th>
                      <th>Fee</th>
                      <th>You get</th>
                      <th>Method</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.withdrawals.map((w) => (
                      <tr key={w.id}>
                        <td className="ptable__money">{formatINR(w.amount)}</td>
                        <td className="ptable__money">{w.fee ? `−${formatINR(w.fee)}` : '—'}</td>
                        <td className="ptable__money">{formatINR(w.net)}</td>
                        <td style={{ textTransform: 'capitalize' }}>{w.method}</td>
                        <td>
                          <span className={`badge ${STATUS_BADGE[w.status] ?? 'badge--neutral'}`}>
                            {w.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Earnings ledger */}
          <div className="p-section">
            <h3 className="p-section__title">Earnings &amp; movements</h3>
            {ledger.length === 0 ? (
              <div className="p-empty">
                <h4 className="p-empty__title">Nothing yet</h4>
                <p className="p-empty__text">
                  Payouts from completed online bookings and withdrawals appear here.
                </p>
              </div>
            ) : (
              <div className="ptable-wrap">
                <table className="ptable">
                  <thead>
                    <tr>
                      <th>Detail</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.map((t) => (
                      <tr key={t.id}>
                        <td>
                          <div className="ptable__strong">{t.note}</div>
                          {t.bookingRef && <div className="ptable__sub">#{t.bookingRef}</div>}
                        </td>
                        <td>
                          <span className={`badge ${t.type === 'credit' ? 'badge--green' : 'badge--neutral'}`}>
                            {t.type}
                          </span>
                        </td>
                        <td className="ptable__money">
                          {t.type === 'credit' ? '+' : '−'}
                          {formatINR(t.amount)}
                        </td>
                        <td className="ptable__money">{formatINR(t.balanceAfter)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {open && (
        <div className="pmodal" role="presentation" onMouseDown={() => setOpen(false)}>
          <div
            className="pmodal__box pmodal__box--sm"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h3 className="pmodal__title">Withdraw earnings</h3>
            <p className="pmodal__text">
              Available {formatINR(balance)} · minimum {formatINR(MIN)}.
            </p>
            <label className="field">
              <span className="field__label">Amount</span>
              <input
                type="number"
                min={MIN}
                max={balance}
                className="field__input"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value)
                  setErr('')
                }}
                placeholder={String(MIN)}
                autoFocus
              />
            </label>
            <div className="wd-methods">
              {[
                { id: 'weekly', label: 'Weekly (Sunday)', note: '0% fee' },
                { id: 'instant', label: 'Instant', note: '7% fee' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`wd-method${method === m.id ? ' is-active' : ''}`}
                  onClick={() => setMethod(m.id)}
                >
                  <span className="wd-method__name">{m.label}</span>
                  <span className="wd-method__note">{m.note}</span>
                </button>
              ))}
            </div>
            <div className="wd-summary">
              <span>Fee</span>
              <span className="money">{fee ? `−${formatINR(fee)}` : formatINR(0)}</span>
            </div>
            <div className="wd-summary wd-summary--total">
              <span>You receive</span>
              <span className="money">{formatINR(Math.max(0, net))}</span>
            </div>
            {err && <p className="field__error">{err}</p>}
            <div className="pmodal__actions">
              <button type="button" className="btn btn--outline" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn--gold" onClick={submit} disabled={!valid || busy}>
                {busy ? 'Requesting…' : 'Confirm withdrawal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
