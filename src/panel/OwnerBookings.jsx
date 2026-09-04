import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../store/AppStore'
import { useToast } from '../components/Toast'
import { useConfirm } from '../components/Confirm'
import { formatINR } from '../lib/money'
import './panel-ui.css'

const FILTERS = ['All', 'Upcoming', 'Cancelled']

export default function OwnerBookings() {
  const { ownerBookings, mySalons, completeBooking } = useApp()
  const { push } = useToast()
  const confirm = useConfirm()
  const [filter, setFilter] = useState('All')
  const [busyId, setBusyId] = useState(null)

  const markDone = async (b) => {
    const cash = b.paymentMode === 'offline'
    const ok = await confirm({
      title: cash ? 'Payment complete?' : 'Mark as served?',
      message: cash
        ? `Confirm you collected ${formatINR(b.total)} in cash for ${b.serviceName} (#${b.ref}). This completes the booking and removes it from the live queue.`
        : `Mark ${b.serviceName} (#${b.ref}) as served? It’s already paid online. This completes the booking and removes it from the live queue.`,
      confirmLabel: cash ? 'Payment complete' : 'Mark served',
    })
    if (!ok) return
    setBusyId(b.id)
    try {
      await completeBooking(b)
      push({
        tone: 'success',
        title: cash ? 'Payment marked complete' : 'Marked served',
        body: `#${b.ref} · ${formatINR(b.total)}`,
      })
    } catch (err) {
      push({ tone: 'warn', title: 'Could not update', body: err.message })
    } finally {
      setBusyId(null)
    }
  }

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
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((b) => {
                    const cancelled = b.status === 'cancelled'
                    const paid = b.paymentStatus === 'paid'
                    const actionable = !cancelled && b.status !== 'completed'
                    return (
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
                          <div className="ptable__sub">
                            {paid ? 'Paid' : b.paymentMode === 'online' ? 'Paid' : 'Awaiting cash'}
                          </div>
                        </td>
                        <td className="ptable__money">{formatINR(b.total)}</td>
                        <td>
                          <span
                            className={`badge ${
                              cancelled ? 'badge--red' : b.status === 'completed' ? 'badge--gold' : 'badge--green'
                            }`}
                          >
                            {cancelled ? 'Cancelled' : b.status === 'completed' ? 'Completed' : 'Confirmed'}
                          </span>
                        </td>
                        <td>
                          {actionable ? (
                            <button
                              type="button"
                              className="btn btn--gold btn--sm"
                              onClick={() => markDone(b)}
                              disabled={busyId === b.id}
                            >
                              {busyId === b.id
                                ? '…'
                                : b.paymentMode === 'offline'
                                  ? 'Payment complete'
                                  : 'Mark served'}
                            </button>
                          ) : (
                            <span className="ptable__sub">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  )
}
