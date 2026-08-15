import { useNavigate } from 'react-router-dom'
import { useBooking } from '../state/BookingContext'
import { formatDateLabel } from '../lib/datetime'
import { formatINR } from '../lib/money'
import { IMG_INTERIOR } from '../assets'
import './Confirmed.css'

export default function Confirmed() {
  const navigate = useNavigate()
  const { shop, service, barber, date, slot, total, reference } = useBooking()

  return (
    <div className="done">
      <div className="done__inner anim-up">
        <div className="done__tick" aria-hidden="true">
          ✓
        </div>
        <div className="eyebrow eyebrow--tight">Confirmed · #{reference ?? 'BN-48127'}</div>
        <h1 className="display done__title">Your chair is booked</h1>
        <p className="done__lede">A confirmation is on its way to your phone and inbox.</p>

        <div className="done__card">
          <div className="done__shop">
            <img src={IMG_INTERIOR} alt="" aria-hidden="true" />
            <div>
              <div className="done__shopName">{shop.name}</div>
              <div className="done__shopMeta">
                {shop.address} · {shop.area}
              </div>
              <div className="done__shopRating">
                ★ {shop.rating} · {shop.reviews} reviews
              </div>
            </div>
          </div>
          <div className="done__rows">
            <div className="done__row">
              <span>Service</span>
              <span className="done__val">{service.name}</span>
            </div>
            <div className="done__row">
              <span>Barber</span>
              <span className="done__val">{barber}</span>
            </div>
            <div className="done__row">
              <span>When</span>
              <span className="done__val">
                {formatDateLabel(date)} at {slot}
              </span>
            </div>
            <div className="done__row">
              <span>Total due in shop</span>
              <span className="done__val">{formatINR(total)}</span>
            </div>
          </div>
        </div>

        <div className="done__actions">
          <button
            type="button"
            className="btn btn--gold done__action"
            onClick={() => navigate('/appointments')}
          >
            My appointments
          </button>
          <button type="button" className="btn btn--outline done__action">
            Add to calendar
          </button>
        </div>
      </div>
    </div>
  )
}
