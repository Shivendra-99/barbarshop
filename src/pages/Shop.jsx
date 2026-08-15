import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useBooking } from '../state/BookingContext'
import {
  BARBERS,
  GALLERY,
  OPENING_HOURS,
  QUICK_SLOTS,
  REVIEWS,
  SERVICES,
  SHOPS,
} from '../data/content'
import { IMG_INTERIOR } from '../assets'
import './Shop.css'

const TABS = [
  { key: 'services', label: 'Services' },
  { key: 'gallery', label: 'Gallery' },
  { key: 'reviews', label: 'Reviews' },
]

export default function Shop() {
  const { shopId } = useParams()
  const navigate = useNavigate()
  const { shop, selectShop, selectService } = useBooking()
  const [tab, setTab] = useState('services')

  // Keep context in step with the URL when landing directly on /shop/:id.
  useEffect(() => {
    if (shopId && SHOPS.some((s) => s.id === shopId) && shopId !== shop.id) {
      selectShop(shopId)
    }
  }, [shopId, shop.id, selectShop])

  const bookService = (service) => {
    selectService(service.name)
    navigate('/booking')
  }

  return (
    <div className="shop">
      {/* ---------------- Banner ---------------- */}
      <div className="shop__banner">
        <img className="shop__bannerImg" src={IMG_INTERIOR} alt="" aria-hidden="true" />
        <div className="shop__bannerScrim" />
        <div className="shop__bannerBody">
          <div className="shell">
            <div className="eyebrow eyebrow--tight shop__kicker">
              {shop.area} · Master barbershop
            </div>
            <h1 className="display shop__name">{shop.name}</h1>
            <div className="shop__facts">
              <span className="shop__rating">
                ★ {shop.rating} · {shop.reviews} reviews
              </span>
              <span>{shop.address}</span>
              <span className="shop__open">Open until 21:00</span>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- Body ---------------- */}
      <div className="shell shop__grid">
        <div className="shop__main">
          <div className="tabs shop__tabs" role="tablist">
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
            <div>
              {SERVICES.map((s) => (
                <div key={s.name} className="svc">
                  <div className="svc__info">
                    <div className="svc__name">{s.name}</div>
                    <p className="svc__desc">{s.desc}</p>
                  </div>
                  <div className="svc__right">
                    <div className="svc__priceBlock">
                      <div className="svc__price">{s.price}</div>
                      <div className="svc__dur">{s.dur}</div>
                    </div>
                    <button
                      type="button"
                      className="btn btn--ghost-gold svc__book"
                      onClick={() => bookService(s)}
                    >
                      Book
                    </button>
                  </div>
                </div>
              ))}

              <div className="team">
                <h2 className="team__title">The team</h2>
                <div className="team__grid">
                  {BARBERS.map((b) => (
                    <div key={b.name} className="card team__card">
                      <img src={b.img} alt={b.name} loading="lazy" />
                      <div className="team__body">
                        <div className="team__name">{b.name}</div>
                        <div className="team__role">
                          {b.role} · {b.years}
                        </div>
                        <div className="team__rating">★ {b.rating}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'gallery' && (
            <div className="gallery">
              {GALLERY.map((g, i) => (
                <div
                  // eslint-disable-next-line react/no-array-index-key
                  key={i}
                  className="gallery__cell"
                  style={{ gridColumn: `span ${g.span}` }}
                >
                  <img src={g.img} alt={`${shop.name} work sample ${i + 1}`} loading="lazy" />
                </div>
              ))}
            </div>
          )}

          {tab === 'reviews' && (
            <div>
              {REVIEWS.map((r) => (
                <div key={r.name} className="rev">
                  <div className="rev__top">
                    <div className="rev__name">{r.name}</div>
                    <div className="rev__date">{r.date}</div>
                  </div>
                  <div className="rev__stars">★★★★★</div>
                  <p className="rev__body">{r.body}</p>
                  <div className="rev__meta">
                    {r.service} with {r.barber}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ---------------- Booking rail ---------------- */}
        <aside className="rail">
          <div className="eyebrow eyebrow--tight">Next availability</div>
          <div className="rail__next">Today, 17:30</div>

          <div className="rail__slots">
            {QUICK_SLOTS.map((q) => (
              <button
                key={q}
                type="button"
                className="rail__slot"
                onClick={() => navigate('/booking')}
              >
                {q}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="btn btn--gold btn--block"
            onClick={() => navigate('/booking')}
          >
            Book appointment
          </button>

          <div className="rail__hours">
            {OPENING_HOURS.map((h) => (
              <div key={h.days} className="rail__hoursRow">
                <span>{h.days}</span>
                <span className="rail__hoursVal">{h.hours}</span>
              </div>
            ))}
          </div>

          <div className="rail__note">
            Free cancellation up to 4 hours before your slot.
          </div>
        </aside>
      </div>
    </div>
  )
}
