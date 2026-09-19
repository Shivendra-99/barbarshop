import { Link, Navigate, useParams } from 'react-router-dom'
import { useApp } from '../store/AppStore'
import { useT } from '../lib/i18n'
import { formatINR } from '../lib/money'
import { formatTime12 } from '../lib/datetime'
import './Confirmed.css'

export default function Confirmed() {
  const { bookingId } = useParams()
  const { myBookings, publicSalons } = useApp()
  const t = useT()

  const booking = myBookings.find((b) => b.id === bookingId)
  if (!booking) return <Navigate to="/appointments" replace />

  const salon = publicSalons.find((s) => s.id === booking.salonId)
  // Live salon number wins; fall back to the snapshot saved on the booking.
  const salonPhone = salon?.phone || booking.salonPhone || ''

  const items = booking.items ?? []
  // A real Razorpay payment carries a paymentId; the demo online flow doesn't.
  const rzpId = booking.razorpay?.paymentId ?? null
  const paidOnline = booking.paymentMode === 'online' && booking.paymentStatus === 'paid'
  const payMethod = paidOnline
    ? rzpId
      ? t('done.paidOnlineRzp')
      : t('done.paidOnline')
    : t('done.cashAtSalon')

  return (
    <div className="done">
      <div className="done__inner anim-up">
        <div className="done__tick" aria-hidden="true">
          <svg viewBox="0 0 52 52">
            <circle className="done__tickCircle" cx="26" cy="26" r="24" />
            <path className="done__tickMark" d="M14 27l8 8 16-16" />
          </svg>
        </div>

        <div className="eyebrow">{t('done.confirmedRef', { ref: booking.ref })}</div>
        <h1 className="display done__title">{t('done.title')}</h1>
        <p className="lede done__lede">
          {booking.paymentMode === 'online' ? t('done.ledeOnline') : t('done.ledeCash')}
        </p>

        {booking.completionOtp && booking.status !== 'completed' && (
          <div className="done__otp">
            <div className="done__otpLabel">{t('done.otpLabel')}</div>
            <div className="done__otpHint">{t('done.otpHint')}</div>
          </div>
        )}

        <div className="done__card">
          <div className="done__shop">
            <img src={salon?.img} alt="" aria-hidden="true" />
            <div>
              <div className="done__shopName">{booking.salonName}</div>
              <div className="done__shopMeta">{salon?.address}</div>
              <div className="done__shopRating">
                {t('salon.ratingReviews', {
                  rating: salon?.rating.toFixed(1),
                  reviews: salon?.reviews,
                })}
              </div>
            </div>
          </div>

          <dl className="done__rows">
            {items.length > 1 ? (
              <div className="done__row done__row--items">
                <dt>{t('book.services')}</dt>
                <dd>
                  <ul className="done__items">
                    {items.map((it, i) => (
                      <li key={`${it.name}-${i}`}>
                        <span>{it.name}</span>
                        <span className="money">{formatINR(it.amount)}</span>
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            ) : (
              <div className="done__row">
                <dt>{t('book.service')}</dt>
                <dd>{booking.serviceName}</dd>
              </div>
            )}
            <div className="done__row">
              <dt>{t('done.where')}</dt>
              <dd>{t(`mode.${booking.mode}`)}</dd>
            </div>
            {booking.address && (
              <div className="done__row">
                <dt>{t('done.address')}</dt>
                <dd>{booking.address}</dd>
              </div>
            )}
            <div className="done__row">
              <dt>{t('done.professional')}</dt>
              <dd>{booking.staffName ?? t('done.anyAvailable')}</dd>
            </div>
            <div className="done__row">
              <dt>{t('done.when')}</dt>
              <dd>{t('done.whenAt', { date: booking.dateLabel, slot: formatTime12(booking.slot) })}</dd>
            </div>
            <div className="done__row">
              <dt>{t('done.payment')}</dt>
              <dd className="done__pay">
                {payMethod}
                <span
                  className={`done__payStatus done__payStatus--${
                    booking.paymentStatus === 'paid' ? 'paid' : 'pending'
                  }`}
                >
                  {booking.paymentStatus === 'paid' ? t('done.paid') : t('done.pending')}
                </span>
              </dd>
            </div>
            {rzpId && (
              <div className="done__row">
                <dt>{t('done.paymentId')}</dt>
                <dd className="done__payId">{rzpId}</dd>
              </div>
            )}
            {booking.offerDiscount > 0 && (
              <div className="done__row done__row--save">
                <dt>{t('book.offerDiscount', { pct: booking.offerPercent })}</dt>
                <dd className="money">−{formatINR(booking.offerDiscount)}</dd>
              </div>
            )}
            {booking.discount > 0 && (
              <div className="done__row done__row--save">
                <dt>{t('book.firstDiscount')}</dt>
                <dd className="money">−{formatINR(booking.discount)}</dd>
              </div>
            )}
            <div className="done__row done__row--total">
              <dt>{booking.paymentMode === 'online' ? t('done.paid') : t('done.dueAtSalon')}</dt>
              <dd className="money">{formatINR(booking.total)}</dd>
            </div>
          </dl>
        </div>

        <div className="done__actions">
          <Link to="/appointments" className="btn btn--gold done__action">
            {t('nav.mybookings')}
          </Link>
          {salonPhone && (
            <a
              href={`https://wa.me/91${salonPhone.replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(
                `Hi ${salon?.name || 'there'}! I just booked an appointment on SalonSaathi:\n\n` +
                  `• Service: ${booking.serviceName}\n` +
                  `• Date & Time: ${booking.dateLabel}, ${formatTime12(booking.slot)}\n` +
                  `• Mode: ${booking.mode === 'home' ? 'Home Service' : 'At Salon'}\n` +
                  `• Booking ID: #${booking.ref}\n` +
                  `• Total: ₹${booking.total} (${booking.paymentMode === 'online' ? 'Paid Online' : 'Cash at Salon'})\n\n` +
                  `Please confirm you have received my booking.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--outline done__action done__action--wa"
            >
              WhatsApp Salon
            </a>
          )}
          {salonPhone ? (
            <a href={`tel:+91${salonPhone}`} className="btn btn--outline done__action">
              {t('appt.callSalon')}
            </a>
          ) : (
            <Link to="/salons" className="btn btn--outline done__action">
              {t('done.bookAnother')}
            </Link>
          )}
        </div>

        <p className="done__fine">{t('done.fine')}</p>
      </div>
    </div>
  )
}
