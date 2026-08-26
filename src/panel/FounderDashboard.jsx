import { useApp } from '../store/AppStore'
import { useToast } from '../components/Toast'
import { useConfirm } from '../components/Confirm'
import { cityById } from '../data/seed'
import { formatINR, formatCompactINR } from '../lib/money'
import './panel-ui.css'

const KPI_ICONS = {
  bookings: 'M4 6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM4 9h16M8 3v4M16 3v4',
  earnings: 'M12 3v18M8 7h6a2.5 2.5 0 0 1 0 5H8h8a2.5 2.5 0 0 1 0 5H8',
  salons: 'M4 9V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3M4 9h16M4 9l1 11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1l1-11',
  pending: 'M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z',
}

function Kpi({ icon, label, value, delta, deltaUp }) {
  return (
    <div className="kpi">
      <div className="kpi__icon">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d={KPI_ICONS[icon]} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="kpi__label">{label}</div>
      <div className="kpi__value">{value}</div>
      {delta && <div className={`kpi__delta${deltaUp ? ' kpi__delta--up' : ''}`}>{delta}</div>}
    </div>
  )
}

export default function FounderDashboard() {
  const { platformStats, pendingSalons, bookings, setSalonStatus } = useApp()
  const { push } = useToast()
  const confirm = useConfirm()

  const recent = bookings.slice(0, 6)

  const decide = async (salon, approve) => {
    if (!approve) {
      const ok = await confirm({
        title: 'Reject this salon?',
        message: `${salon.name} will be declined and won't appear to customers.`,
        confirmLabel: 'Reject',
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
      <div className="p-head">
        <h2 className="p-head__title">Dashboard Overview</h2>
        <p className="p-head__sub">Welcome back — here&rsquo;s the platform performance overview.</p>
      </div>

      <div className="kpis">
        <Kpi
          icon="bookings"
          label="Total bookings"
          value={platformStats.totalBookings.toLocaleString('en-IN')}
          delta={`${platformStats.liveBookings} active`}
          deltaUp
        />
        <Kpi
          icon="earnings"
          label="Online earnings"
          value={formatCompactINR(platformStats.earnings)}
          delta="Paid to platform"
        />
        <Kpi
          icon="salons"
          label="Active salons"
          value={platformStats.activeSalons}
          delta="Live on platform"
          deltaUp
        />
        <Kpi
          icon="pending"
          label="Pending requests"
          value={platformStats.pendingCount}
          delta={platformStats.pendingCount > 0 ? 'Needs review' : 'All clear'}
        />
      </div>

      <div className="p-cols p-section">
        {/* ---- Approval queue ---- */}
        <div>
          <div className="p-section__head">
            <h3 className="p-section__title">
              New salon approval requests
              {pendingSalons.length > 0 && (
                <span className="badge badge--amber">{pendingSalons.length} pending</span>
              )}
            </h3>
          </div>

          {pendingSalons.length === 0 ? (
            <div className="p-empty">
              <h4 className="p-empty__title">No pending requests</h4>
              <p className="p-empty__text">
                New salons submitted by owners will appear here for review.
              </p>
            </div>
          ) : (
            <ul className="reqList">
              {pendingSalons.map((salon) => (
                <li key={salon.id} className="reqRow">
                  {salon.img && <img className="reqRow__media" src={salon.img} alt="" />}
                  <div className="reqRow__body">
                    <div className="reqRow__name">{salon.name}</div>
                    <div className="reqRow__meta">
                      {salon.area}, {cityById(salon.city).label} · {salon.address}
                    </div>
                  </div>
                  <div className="reqRow__actions">
                    <button
                      type="button"
                      className="btn btn--gold btn--sm"
                      onClick={() => decide(salon, true)}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="btn btn--danger btn--sm"
                      onClick={() => decide(salon, false)}
                    >
                      Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ---- Recent bookings ---- */}
        <div>
          <div className="p-section__head">
            <h3 className="p-section__title">Recent bookings</h3>
          </div>

          {recent.length === 0 ? (
            <div className="p-empty">
              <h4 className="p-empty__title">No bookings yet</h4>
              <p className="p-empty__text">Bookings across all salons will show here.</p>
            </div>
          ) : (
            <div className="ptable-wrap">
              <table className="ptable">
                <thead>
                  <tr>
                    <th>Booking</th>
                    <th>Salon</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <div className="ptable__strong">#{b.ref}</div>
                        <div className="ptable__sub">{b.serviceName}</div>
                      </td>
                      <td>
                        <div>{b.salonName}</div>
                        <div className="ptable__sub">{b.dateLabel}, {b.slot}</div>
                      </td>
                      <td className="ptable__money">{formatINR(b.total)}</td>
                      <td>
                        <span
                          className={`badge ${
                            b.status === 'cancelled' ? 'badge--red' : 'badge--green'
                          }`}
                        >
                          {b.status === 'cancelled' ? 'Cancelled' : 'Confirmed'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
