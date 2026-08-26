import { useMemo, useState } from 'react'
import { useApp } from '../store/AppStore'
import { formatINR } from '../lib/money'
import './panel-ui.css'

const FILTERS = ['All', 'Online', 'Cash', 'Cancelled']

export default function FounderBookings() {
  const { bookings } = useApp()
  const [filter, setFilter] = useState('All')

  const rows = useMemo(() => {
    switch (filter) {
      case 'Online':
        return bookings.filter((b) => b.paymentMode === 'online' && b.status !== 'cancelled')
      case 'Cash':
        return bookings.filter((b) => b.paymentMode === 'offline' && b.status !== 'cancelled')
      case 'Cancelled':
        return bookings.filter((b) => b.status === 'cancelled')
      default:
        return bookings
    }
  }, [bookings, filter])

  // Cash collected by salons vs online settled to the platform.
  const totals = useMemo(() => {
    const live = bookings.filter((b) => b.status !== 'cancelled')
    return {
      online: live.filter((b) => b.paymentMode === 'online').reduce((s, b) => s + b.total, 0),
      cash: live.filter((b) => b.paymentMode === 'offline').reduce((s, b) => s + b.total, 0),
    }
  }, [bookings])

  return (
    <>
      <div className="p-head">
        <h2 className="p-head__title">Bookings</h2>
        <p className="p-head__sub">
          Online {formatINR(totals.online)} settled to platform · Cash {formatINR(totals.cash)}{' '}
          collected at salons.
        </p>
      </div>

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
                <th>When</th>
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
                  <td>
                    <div>{b.salonName}</div>
                    <div className="ptable__sub">{b.modeLabel}</div>
                  </td>
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
  )
}
