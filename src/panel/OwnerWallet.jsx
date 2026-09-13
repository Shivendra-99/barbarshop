import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../store/AppStore'
import { formatINR, formatCompactINR } from '../lib/money'
import './panel-ui.css'

/**
 * Owner Wallet — an earnings ledger built from the owner's bookings.
 * Display-only for now: online money is settled to the platform and cash is
 * collected at the salon; real bank payouts to owners need a settlement setup
 * (e.g. Razorpay Route), which isn't wired yet.
 */
export default function OwnerWallet() {
  const { ownerBookings, mySalons } = useApp()

  const { paid, totals } = useMemo(() => {
    const live = ownerBookings.filter((b) => b.status !== 'cancelled')
    const paidRows = live
      .filter((b) => b.paymentStatus === 'paid')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    const online = paidRows
      .filter((b) => b.paymentMode === 'online')
      .reduce((s, b) => s + (b.total || 0), 0)
    const cash = paidRows
      .filter((b) => b.paymentMode === 'offline')
      .reduce((s, b) => s + (b.total || 0), 0)
    const pending = live
      .filter((b) => b.paymentMode === 'offline' && b.paymentStatus !== 'paid')
      .reduce((s, b) => s + (b.total || 0), 0)
    const commission = paidRows.reduce((s, b) => s + (b.commission || 0), 0)
    const net = paidRows.reduce((s, b) => s + (b.salonPayout ?? b.total ?? 0), 0)

    return {
      paid: paidRows,
      totals: { online, cash, pending, commission, net, gross: online + cash },
    }
  }, [ownerBookings])

  return (
    <>
      <div className="p-head">
        <h2 className="p-head__title">Wallet</h2>
        <p className="p-head__sub">Earnings across your salons.</p>
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
          {/* Balance banner */}
          <div className="wallet-hero">
            <div className="wallet-hero__label">Net earnings</div>
            <div className="wallet-hero__value">{formatINR(totals.net)}</div>
            <div className="wallet-hero__sub">
              {formatINR(totals.gross)} collected · {formatINR(totals.commission)} platform fee
            </div>
          </div>

          <div className="kpis">
            <div className="kpi">
              <div className="kpi__label">Online received</div>
              <div className="kpi__value">{formatCompactINR(totals.online)}</div>
              <div className="kpi__delta">Paid via app</div>
            </div>
            <div className="kpi">
              <div className="kpi__label">Cash collected</div>
              <div className="kpi__value">{formatCompactINR(totals.cash)}</div>
              <div className="kpi__delta">At the salon</div>
            </div>
            <div className="kpi">
              <div className="kpi__label">Pending collection</div>
              <div className="kpi__value">{formatCompactINR(totals.pending)}</div>
              <div className="kpi__delta">Cash to collect</div>
            </div>
            <div className="kpi">
              <div className="kpi__label">Platform fee</div>
              <div className="kpi__value">{formatCompactINR(totals.commission)}</div>
              <div className="kpi__delta">Deducted</div>
            </div>
          </div>

          <div className="p-section">
            <div className="p-section__head">
              <h3 className="p-section__title">Transactions</h3>
              <Link to="/owner/bookings" className="section__more">
                All bookings
              </Link>
            </div>

            {paid.length === 0 ? (
              <div className="p-empty">
                <h4 className="p-empty__title">No earnings yet</h4>
                <p className="p-empty__text">
                  Paid bookings (online, or cash you&rsquo;ve marked complete) show up here.
                </p>
              </div>
            ) : (
              <div className="ptable-wrap">
                <table className="ptable">
                  <thead>
                    <tr>
                      <th>Booking</th>
                      <th>Salon</th>
                      <th>Method</th>
                      <th>Amount</th>
                      <th>Fee</th>
                      <th>You get</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paid.map((b) => (
                      <tr key={b.id}>
                        <td>
                          <div className="ptable__strong">#{b.ref}</div>
                          <div className="ptable__sub">{b.serviceName}</div>
                          {b.razorpay?.paymentId && (
                            <div className="ptable__mono">{b.razorpay.paymentId}</div>
                          )}
                        </td>
                        <td>{b.salonName}</td>
                        <td>
                          <span
                            className={`badge ${b.paymentMode === 'online' ? 'badge--gold' : 'badge--neutral'}`}
                          >
                            {b.paymentMode === 'online' ? 'Online' : 'Cash'}
                          </span>
                        </td>
                        <td className="ptable__money">{formatINR(b.total)}</td>
                        <td className="ptable__money">
                          {b.commission ? `−${formatINR(b.commission)}` : '—'}
                        </td>
                        <td className="ptable__money">{formatINR(b.salonPayout ?? b.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p className="wallet-note">
            Online payments are settled to SalonSaathi and paid out to you per your payout terms.
            Cash is collected directly at your salon.
          </p>
        </>
      )}
    </>
  )
}
