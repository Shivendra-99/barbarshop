import { Link, Navigate, useParams } from 'react-router-dom'
import { useApp } from '../store/AppStore'
import { formatINR } from '../lib/money'
import './Confirmed.css'

export default function Confirmed() {
  const { bookingId } = useParams()
  const { myBookings, publicSalons } = useApp()

  const booking = myBookings.find((b) => b.id === bookingId)
  if (!booking) return <Navigate to="/appointments" replace />

  const salon = publicSalons.find((s) => s.id === booking.salonId)

  return (
    <div className="done">
      <div className="done__inner anim-up">
        <div className="done__tick" aria-hidden="true">
          <svg viewBox="0 0 52 52">
            <circle className="done__tickCircle" cx="26" cy="26" r="24" />
            <path className="done__tickMark" d="M14 27l8 8 16-16" />
          </svg>
        </div>

        <div className="eyebrow">Confirmed · #{booking.ref}</div>
        <h1 className="display done__title">Your appointment is booked</h1>
        <p className="lede done__lede">
          {booking.paymentMode === 'online'
            ? 'Payment received. A confirmation is on its way to your phone.'
            : 'Slot held. Pay cash at the salon when you arrive.'}
        </p>

        <div className="done__card">
          <div className="done__shop">
            <img src={salon?.img} alt="" aria-hidden="true" />
            <div>
              <div className="done__shopName">{booking.salonName}</div>
              <div className="done__shopMeta">{salon?.address}</div>
              <div className="done__shopRating">
                ★ {salon?.rating.toFixed(1)} · {salon?.reviews} reviews
              </div>
            </div>
          </div>

          <dl className="done__rows">
            <div className="done__row">
              <dt>Service</dt>
              <dd>{booking.serviceName}</dd>
            </div>
            <div className="done__row">
              <dt>Where</dt>
              <dd>{booking.modeLabel}</dd>
            </div>
            {booking.address && (
              <div className="done__row">
                <dt>Address</dt>
                <dd>{booking.address}</dd>
              </div>
            )}
            <div className="done__row">
              <dt>Professional</dt>
              <dd>{booking.staffName ?? 'Any available'}</dd>
            </div>
            <div className="done__row">
              <dt>When</dt>
              <dd>
                {booking.dateLabel} at {booking.slot}
              </dd>
            </div>
            <div className="done__row">
              <dt>Payment</dt>
              <dd>{booking.paymentMode === 'online' ? 'Paid online' : 'Cash at salon'}</dd>
            </div>
            {booking.discount > 0 && (
              <div className="done__row done__row--save">
                <dt>First booking discount</dt>
                <dd className="money">−{formatINR(booking.discount)}</dd>
              </div>
            )}
            <div className="done__row done__row--total">
              <dt>{booking.paymentMode === 'online' ? 'Paid' : 'Due at salon'}</dt>
              <dd className="money">{formatINR(booking.total)}</dd>
            </div>
          </dl>
        </div>

        <div className="done__actions">
          <Link to="/appointments" className="btn btn--gold done__action">
            My bookings
          </Link>
          <Link to="/salons" className="btn btn--outline done__action">
            Book another
          </Link>
        </div>

        <p className="done__fine">
          Free cancellation up to 4 hours before your slot. Refunds go to your wallet instantly
          or back to UPI in 2–3 working days.
        </p>
      </div>
    </div>
  )
}
