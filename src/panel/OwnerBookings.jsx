import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../store/AppStore'
import { useToast } from '../components/Toast'
import { useConfirm } from '../components/Confirm'
import { formatINR } from '../lib/money'
import './panel-ui.css'

const FILTERS = ['All', 'Upcoming', 'Cancelled']

export default function OwnerBookings() {
  const { ownerBookings, mySalons, completeBooking, markNoShow } = useApp()
  const { push } = useToast()
  const confirm = useConfirm()
  const [filter, setFilter] = useState('All')
  const [busyId, setBusyId] = useState(null)
  const [otpFor, setOtpFor] = useState(null) // booking awaiting OTP to complete
  const [otpValue, setOtpValue] = useState('')
  const [otpErr, setOtpErr] = useState('')
  const [otpBusy, setOtpBusy] = useState(false)

  const submitComplete = async () => {
    const b = otpFor
    if (!b || otpBusy) return
    setOtpBusy(true)
    setOtpErr('')
    try {
      await completeBooking(b, otpValue.trim())
      push({
        tone: 'success',
        title: b.paymentMode === 'offline' ? 'Payment marked complete' : 'Service completed',
        body: `#${b.ref} · ${formatINR(b.total)}`,
      })
      setOtpFor(null)
      setOtpValue('')
    } catch (err) {
      setOtpErr(err.message || 'Could not complete.')
    } finally {
      setOtpBusy(false)
    }
  }

  const doNoShow = async (b) => {
    const ok = await confirm({
      title: 'Mark as no-show?',
      message: `Confirm ${b.serviceName} (#${b.ref}) as a no-show. ${
        b.paymentMode === 'online'
          ? 'A 15% penalty applies; 85% is refunded to the customer’s wallet.'
          : 'This counts as a strike against the customer’s cash bookings.'
      }`,
      confirmLabel: 'Mark no-show',
      tone: 'danger',
    })
    if (!ok) return
    setBusyId(b.id)
    try {
      await markNoShow(b)
      push({ tone: 'info', title: 'No-show recorded', body: `#${b.ref}` })
    } catch (err) {
      push({ tone: 'warn', title: 'Could not update', body: err.message })
    } finally {
      setBusyId(null)
    }
  }

  const openComplete = (b) => {
    setOtpValue('')
    setOtpErr('')
    setOtpFor(b)
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
                          {b.razorpay?.paymentId && (
                            <div className="ptable__mono" title="Razorpay Payment ID">
                              {b.razorpay.paymentId}
                            </div>
                          )}
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
                            <div className="fs-actions">
                              <button
                                type="button"
                                className="btn btn--gold btn--sm"
                                onClick={() => openComplete(b)}
                                disabled={busyId === b.id}
                              >
                                {b.paymentMode === 'offline' ? 'Payment complete' : 'Mark served'}
                              </button>
                              <button
                                type="button"
                                className="btn btn--outline btn--sm"
                                onClick={() => doNoShow(b)}
                                disabled={busyId === b.id}
                              >
                                No-show
                              </button>
                            </div>
                          ) : (
                            <span className="ptable__sub">
                              {b.noShow ? 'No-show' : '—'}
                            </span>
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

      {otpFor && (
        <div className="pmodal" role="presentation" onMouseDown={() => setOtpFor(null)}>
          <div
            className="pmodal__box pmodal__box--sm"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h3 className="pmodal__title">Complete service</h3>
            <p className="pmodal__text">
              Ask the customer for their <strong>4-digit OTP</strong> for {otpFor.serviceName} (#
              {otpFor.ref})
              {otpFor.paymentMode === 'offline'
                ? `, and confirm you collected ${formatINR(otpFor.total)} in cash.`
                : '.'}
            </p>
            <input
              className="field__input otp-input"
              value={otpValue}
              onChange={(e) => {
                setOtpValue(e.target.value.replace(/\D/g, '').slice(0, 4))
                setOtpErr('')
              }}
              inputMode="numeric"
              placeholder="0000"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && submitComplete()}
            />
            {otpErr && <p className="field__error">{otpErr}</p>}
            <div className="pmodal__actions">
              <button type="button" className="btn btn--outline" onClick={() => setOtpFor(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--gold"
                onClick={submitComplete}
                disabled={otpBusy || otpValue.length < 4}
              >
                {otpBusy ? 'Verifying…' : 'Verify & complete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
