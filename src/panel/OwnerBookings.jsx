import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../store/AppStore'
import { formatINR } from '../lib/money'
import './panel-ui.css'

const FILTERS = ['All', 'Upcoming', 'Cancelled']

export default function OwnerBookings() {
  const { ownerBookings, mySalons } = useApp()
  const [filter, setFilter] = useState('All')

  const rows = useMemo(() => {
    switch (filter) {
      case 'Upcoming':
        return ownerBookings.filter((b) => b.status !== 'cancelled')
      case 'Cancelled':
        return ownerBookings.filter((b) => b.status === 'cancelled')
      default:
        return ownerBookings
    }
  }, [ownerBookings, filter])

  return (
    <>
      <div className="p-head">
        <h2 className="p-head__title">Bookings</h2>
        <p className="p-head__sub">Every booking across your salons.</p>
      </div>

      {mySalons.length === 0 ? (
        <div className="p-empty">
          <h4 className="p-empty__title">No salons yet</h4>
          <p className="p-empty__text">
            Add a salon first — bookings for it will show up here.
          </p>
          <Link to="/owner/add" className="btn btn--gold btn--sm" style={{ marginTop: 16 }}>
            + Add salon
          </Link>
        </div>
      ) : (
        <>
          <div className="fs-filters">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                className="chip"
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>

          {rows.length === 0 ? (
            <div className="p-empty">
              <h4 className="p-empty__title">No bookings</h4>
              <p className="p-empty__text">Nothing matches this filter yet.</p>
            </div>
          ) : (
            <div className="ptable-wrap">
              <table className="ptable">
                <thead>
                  <tr>
                    <th>Booking</th>
                    <th>Salon</th>
                    <th>Customer slot</th>
                    <th>Where</th>
                    <th>Payment</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((b) => (
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
                      <td>{b.modeLabel}</td>
                      <td>
                        <span className={`badge ${b.paymentMode === 'online' ? 'badge--gold' : 'badge--neutral'}`}>
                          {b.paymentMode === 'online' ? 'Online' : 'Cash'}
                        </span>
                      </td>
                      <td className="ptable__money">{formatINR(b.total)}</td>
                      <td>
                        <span className={`badge ${b.status === 'cancelled' ? 'badge--red' : 'badge--green'}`}>
                          {b.status === 'cancelled' ? 'Cancelled' : 'Confirmed'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  )
}
