import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../store/AppStore'
import { CITIES, categoryById } from '../data/seed'
import { formatINR, formatCompactINR } from '../lib/money'

/** Salon city label — district for PIN-added cities, else the seeded label. */
const cityLabel = (s) => s.district || CITIES.find((c) => c.id === s.city)?.label || s.city
import './panel-ui.css'

const STATUS_BADGE = {
  approved: 'badge--green',
  pending: 'badge--amber',
  rejected: 'badge--red',
}

function Kpi({ label, value, delta }) {
  return (
    <div className="kpi">
      <div className="kpi__label">{label}</div>
      <div className="kpi__value">{value}</div>
      {delta && <div className="kpi__delta">{delta}</div>}
    </div>
  )
}

export default function OwnerDashboard() {
  const { mySalons, ownerBookings, session } = useApp()

  const stats = useMemo(() => {
    const live = ownerBookings.filter((b) => b.status !== 'cancelled')
    const online = live
      .filter((b) => b.paymentMode === 'online')
      .reduce((s, b) => s + b.total, 0)
    // Offline counts only once the owner has marked payment complete.
    const offlinePaid = live
      .filter((b) => b.paymentMode === 'offline' && b.paymentStatus === 'paid')
      .reduce((s, b) => s + b.total, 0)
    const offlinePending = live
      .filter((b) => b.paymentMode === 'offline' && b.paymentStatus !== 'paid')
      .reduce((s, b) => s + b.total, 0)
    return {
      salons: mySalons.length,
      approved: mySalons.filter((s) => s.status === 'approved').length,
      pending: mySalons.filter((s) => s.status === 'pending').length,
      bookings: live.length,
      online,
      offlinePaid,
      offlinePending,
    }
  }, [mySalons, ownerBookings])

  const recent = ownerBookings.slice(0, 6)

  return (
    <>
      <div className="p-head">
        <h2 className="p-head__title">Welcome back, {session?.name?.split(' ')[0]}</h2>
        <p className="p-head__sub">Your salons, bookings and earnings at a glance.</p>
      </div>

      <div className="kpis">
        <Kpi label="Online earnings" value={formatCompactINR(stats.online)} delta="Paid via app" />
        <Kpi label="Offline earnings" value={formatCompactINR(stats.offlinePaid)} delta="Cash collected" />
        <Kpi
          label="Pending collection"
          value={formatCompactINR(stats.offlinePending)}
          delta="Cash to collect"
        />
        <Kpi label="Bookings" value={stats.bookings} delta={`${stats.salons} salons`} />
      </div>

      <div className="p-section">
        <div className="p-section__head">
          <h3 className="p-section__title">
            Your salons
            {stats.pending > 0 && <span className="badge badge--amber">{stats.pending} pending</span>}
          </h3>
          <Link to="/owner/add" className="btn btn--gold btn--sm">
            + Add salon
          </Link>
        </div>

        {mySalons.length === 0 ? (
          <div className="p-empty">
            <h4 className="p-empty__title">No salons yet</h4>
            <p className="p-empty__text">
              Add your first salon and our team will review it before it goes live.
            </p>
          </div>
        ) : (
          <div className="ptable-wrap">
            <table className="ptable">
              <thead>
                <tr>
                  <th>Salon</th>
                  <th>Type</th>
                  <th>City</th>
                  <th>From</th>
                  <th>Modes</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {mySalons.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div className="ptable__strong">{s.name}</div>
                      <div className="ptable__sub">{s.area}</div>
                    </td>
                    <td>{categoryById(s.category).label}</td>
                    <td>{cityLabel(s)}</td>
                    <td className="ptable__money">{s.from ? formatINR(s.from) : '—'}</td>
                    <td>{s.serviceModes.map((m) => (m === 'home' ? 'Home' : 'Salon')).join(' · ')}</td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[s.status] ?? 'badge--neutral'}`}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="p-section">
        <div className="p-section__head">
          <h3 className="p-section__title">Recent bookings</h3>
          <Link to="/owner/bookings" className="section__more">
            View all
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="p-empty">
            <h4 className="p-empty__title">No bookings yet</h4>
            <p className="p-empty__text">Bookings for your salons will appear here.</p>
          </div>
        ) : (
          <div className="ptable-wrap">
            <table className="ptable">
              <thead>
                <tr>
                  <th>Booking</th>
                  <th>Salon</th>
                  <th>When</th>
                  <th>Payment</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <div className="ptable__strong">#{b.ref}</div>
                      <div className="ptable__sub">{b.serviceName}</div>
                    </td>
                    <td>{b.salonName}</td>
                    <td>
                      {b.dateLabel}
                      <div className="ptable__sub">{b.slot}</div>
                    </td>
                    <td>
                      <span className={`badge ${b.paymentMode === 'online' ? 'badge--gold' : 'badge--neutral'}`}>
                        {b.paymentMode === 'online' ? 'Online' : 'Cash'}
                      </span>
                    </td>
                    <td className="ptable__money">{formatINR(b.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
