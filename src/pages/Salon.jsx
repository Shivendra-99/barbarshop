import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../store/AppStore'
import { categoryById, servicesFor } from '../data/seed'
import { formatINR } from '../lib/money'
import { SERVICE_MODES } from '../lib/pricing'
import './Salon.css'

const TABS = [
  { key: 'services', label: 'Services' },
  { key: 'team', label: 'Team' },
  { key: 'about', label: 'About' },
]

export default function Salon() {
  const { salonId } = useParams()
  const navigate = useNavigate()
  const { publicSalons, isFirstBooking, isSignedIn } = useApp()
  const [tab, setTab] = useState('services')

  const salon = publicSalons.find((s) => s.id === salonId)

  // A salon can be un-listed by the founder while someone holds the link.
  if (!salon) return <Navigate to="/salons" replace />

  const category = categoryById(salon.category)
  const services = servicesFor(salon.category)
  const offersHome = salon.serviceModes.includes('home')

  const book = (serviceId) => {
    const query = serviceId ? `?service=${encodeURIComponent(serviceId)}` : ''
    navigate(`/book/${salon.id}${query}`)
  }

  return (
    <div className="salon">
      <div className="salon__banner">
        <img className="salon__bannerImg" src={salon.img} alt="" aria-hidden="true" />
        <div className="salon__bannerScrim" />
        <div className="shell salon__bannerBody">
          <div className="salon__kicker">
            {category.label} · {salon.area}
          </div>
          <h1 className="display salon__name">{salon.name}</h1>
          <div className="salon__facts">
            <span className="salon__rating">
              ★ {salon.rating.toFixed(1)} · {salon.reviews} reviews
            </span>
            <span>{salon.address}</span>
            <span className="salon__open">
              Open {salon.opens} – {salon.closes}
            </span>
          </div>
          <div className="salon__modes">
            {salon.serviceModes.map((m) => (
              <span key={m} className="badge badge--gold">
                {SERVICE_MODES[m].label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="shell salon__grid">
        <div className="salon__main">
          <div className="tabs salon__tabs" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                className="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'services' && (
            <ul className="svcList">
              {services.map((s) => (
                <li key={s.id} className="svc">
                  <div className="svc__info">
                    <h3 className="svc__name">{s.name}</h3>
                    <p className="svc__desc">{s.desc}</p>
                  </div>
                  <div className="svc__right">
                    <div className="svc__priceBlock">
                      <div className="svc__price money">{formatINR(s.amount)}</div>
                      <div className="svc__dur">{s.mins} min</div>
                    </div>
                    <button
                      type="button"
                      className="btn btn--ghost-gold btn--sm"
                      onClick={() => book(s.id)}
                    >
                      Book
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {tab === 'team' && (
            <div className="grid3 team">
              {salon.staff.map((p) => (
                <div key={p.id} className="card team__card">
                  <img src={p.img} alt="" aria-hidden="true" loading="lazy" />
                  <div className="team__body">
                    <div className="team__name">{p.name}</div>
                    <div className="team__role">
                      {p.role} · {p.years}
                    </div>
                    <div className="team__rating">★ {p.rating.toFixed(1)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'about' && (
            <div className="about">
              <p className="about__text">
                {salon.name} is a {category.label.toLowerCase()} in {salon.area}, {' '}
                offering {category.short.toLowerCase()}. Rated {salon.rating.toFixed(1)} by{' '}
                {salon.reviews} customers.
              </p>
              <dl className="about__list">
                <div className="about__row">
                  <dt>Address</dt>
                  <dd>{salon.address}</dd>
                </div>
                <div className="about__row">
                  <dt>Hours</dt>
                  <dd>
                    {salon.opens} – {salon.closes}, daily
                  </dd>
                </div>
                <div className="about__row">
                  <dt>Service options</dt>
                  <dd>{salon.serviceModes.map((m) => SERVICE_MODES[m].label).join(' · ')}</dd>
                </div>
                {offersHome && (
                  <div className="about__row">
                    <dt>Home service fee</dt>
                    <dd className="money">{formatINR(salon.homeServiceFee)}</dd>
                  </div>
                )}
                <div className="about__row">
                  <dt>Payment</dt>
                  <dd>Pay online or cash at the salon</dd>
                </div>
              </dl>
            </div>
          )}
        </div>

        <aside className="rail">
          <div className="eyebrow">Book an appointment</div>
          <div className="rail__price money">
            From {formatINR(salon.from)}
          </div>

          {isFirstBooking && (
            <div className="rail__offer">
              <strong>10% off</strong> your first booking when you pay online.
            </div>
          )}

          <button type="button" className="btn btn--gold btn--block" onClick={() => book(null)}>
            {isSignedIn ? 'Choose service & slot' : 'Login to book'}
          </button>

          <ul className="rail__modes">
            {salon.serviceModes.map((m) => (
              <li key={m}>
                <span className="rail__modeLabel">{SERVICE_MODES[m].label}</span>
                <span className="rail__modeNote">
                  {m === 'home' && salon.homeServiceFee > 0
                    ? `${SERVICE_MODES[m].note} +${formatINR(salon.homeServiceFee)} travel`
                    : SERVICE_MODES[m].note}
                </span>
              </li>
            ))}
          </ul>

          <div className="rail__note">Free cancellation up to 4 hours before your slot.</div>
        </aside>
      </div>
    </div>
  )
}
