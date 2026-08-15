import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Footer from '../components/Footer'
import Reveal from '../components/Reveal'
import SearchSelect from '../components/SearchSelect'
import { useBooking } from '../state/BookingContext'
import {
  CITIES,
  FAQS,
  SERVICE_FILTERS,
  STEPS,
  TESTIMONIALS,
  WHEN_OPTIONS,
} from '../data/content'
import { IMG_INTERIOR, IMG_AT_WORK } from '../assets'
import './Home.css'

const TRUST = ['★ 4.92 average rating', 'Free cancellation up to 4h', 'Instant confirmation']

export default function Home() {
  const navigate = useNavigate()
  const {
    city,
    selectCity,
    serviceFilter,
    setServiceFilter,
    when,
    setWhen,
    matchingShops,
    selectShop,
  } = useBooking()
  const [openFaq, setOpenFaq] = useState(0)

  const featured = matchingShops.slice(0, 3)

  const openShop = (shop) => {
    selectShop(shop.id)
    navigate(`/shop/${shop.id}`)
  }

  return (
    <>
      {/* ---------------- Hero ---------------- */}
      <section className="hero">
        <img className="hero__bg" src={IMG_INTERIOR} alt="" aria-hidden="true" />
        <div className="hero__scrim" />
        <div className="shell hero__inner">
          <div className="hero__copy anim-up">
            <div className="hero__kicker">
              <span className="hero__rule" />
              <span>1,240 master barbers · 38 cities</span>
            </div>
            <h1 className="display hero__title">
              Book the Perfect Barber Near You in Seconds
            </h1>
            <p className="hero__lede">
              Real-time availability from vetted chairs. Choose your barber, pick a slot,
              confirm with a code. No calls, no waiting rooms.
            </p>
          </div>

          <div className="hero__search anim-up-slow">
            <SearchSelect
              label="Location"
              value={city.label}
              options={CITIES}
              getLabel={(c) => c.label}
              onChange={(c) => selectCity(c.id)}
            />
            <SearchSelect
              label="Service"
              value={serviceFilter}
              options={SERVICE_FILTERS}
              onChange={setServiceFilter}
            />
            <SearchSelect
              label="When"
              value={when}
              options={WHEN_OPTIONS}
              onChange={setWhen}
            />
            <button
              type="button"
              className="hero__search-btn"
              onClick={() => navigate('/explore')}
            >
              Search
            </button>
          </div>

          <div className="hero__trust">
            {TRUST.map((t) => (
              <div key={t}>{t}</div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Featured shops ---------------- */}
      <section className="shell section">
        <Reveal className="section__head">
          <div>
            <div className="eyebrow">Handpicked chairs</div>
            <h2 className="section-title">Featured shops in {city.label}</h2>
          </div>
          <button type="button" className="section__more" onClick={() => navigate('/explore')}>
            View all
          </button>
        </Reveal>

        {featured.length === 0 ? (
          <Reveal className="empty">
            <p className="empty__text">
              No {serviceFilter.toLowerCase()} chairs in {city.label} right now.
            </p>
            <button
              type="button"
              className="btn btn--ghost-gold"
              onClick={() => setServiceFilter(SERVICE_FILTERS[0])}
            >
              Clear service filter
            </button>
          </Reveal>
        ) : (
          <div className="featured">
            {featured.map((shop, i) => (
              <Reveal
                key={shop.id}
                className="featured__card"
                style={{ transitionDelay: `${i * 90}ms` }}
              >
                <button
                  type="button"
                  className="featured__btn"
                  aria-label={`${shop.name}, ${shop.area}, rated ${shop.rating}, from ${shop.price}`}
                  onClick={() => openShop(shop)}
                >
                  <div className="featured__media">
                    <img src={shop.img} alt="" aria-hidden="true" loading="lazy" />
                    <span className="featured__badge">{shop.badge}</span>
                  </div>
                  <div className="featured__body">
                    <div className="featured__row">
                      <span className="featured__name">{shop.name}</span>
                      <span className="featured__rating">★ {shop.rating}</span>
                    </div>
                    <div className="featured__meta">
                      {shop.area} · {shop.dist} · {shop.reviews} reviews
                    </div>
                    <div className="featured__tags">
                      {shop.tags.map((tag) => (
                        <span key={tag} className="tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="featured__foot">
                      <span className="featured__price">
                        from <strong>{shop.price}</strong>
                      </span>
                      <span className="featured__next">{shop.next}</span>
                    </div>
                  </div>
                </button>
              </Reveal>
            ))}
          </div>
        )}
      </section>

      {/* ---------------- How it works ---------------- */}
      <section className="how">
        <div className="shell how__grid">
          <Reveal>
            <img
              className="how__img"
              src={IMG_AT_WORK}
              alt="A barber finishing a skin fade"
              loading="lazy"
            />
          </Reveal>
          <Reveal>
            <div className="eyebrow">How it works</div>
            <h2 className="section-title how__title">Three steps, sixty seconds</h2>
            <ol className="how__steps">
              {STEPS.map((step) => (
                <li key={step.n} className="how__step">
                  <span className="how__n">{step.n}</span>
                  <span>
                    <span className="how__stepTitle">{step.title}</span>
                    <span className="how__stepBody">{step.body}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </section>

      {/* ---------------- Testimonials ---------------- */}
      <section className="shell section">
        <Reveal className="section__centered">
          <div className="eyebrow">Testimonials</div>
          <h2 className="section-title">What members say</h2>
        </Reveal>
        <div className="quotes">
          {TESTIMONIALS.map((t, i) => (
            <Reveal
              key={t.name}
              className="card quotes__card"
              style={{ transitionDelay: `${i * 90}ms` }}
            >
              <div className="quotes__stars">★★★★★</div>
              <blockquote className="quotes__text">“{t.quote}”</blockquote>
              <div className="quotes__name">{t.name}</div>
              <div className="quotes__meta">{t.meta}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------- FAQ ---------------- */}
      <section className="faq">
        <h2 className="section-title faq__title">Frequently asked</h2>
        <div className="faq__list">
          {FAQS.map((f, i) => {
            const open = openFaq === i
            return (
              <div key={f.q} className="faq__item">
                <button
                  type="button"
                  className="faq__q"
                  aria-expanded={open}
                  onClick={() => setOpenFaq(open ? -1 : i)}
                >
                  <span className={open ? 'faq__qText is-open' : 'faq__qText'}>{f.q}</span>
                  <span className={open ? 'faq__plus is-open' : 'faq__plus'} aria-hidden="true">
                    +
                  </span>
                </button>
                <div className={open ? 'faq__panel is-open' : 'faq__panel'}>
                  <div className="faq__a">{f.a}</div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <Footer />
    </>
  )
}
