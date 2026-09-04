import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Reveal from '../components/Reveal'
import { useApp } from '../store/AppStore'
import { usePrefs } from '../store/Prefs'
import { BRAND, CATEGORIES, FAQS, STEPS, TESTIMONIALS } from '../data/seed'
import { IMG_MENS_INTERIOR, IMG_UNISEX, IMG_PARLOUR } from '../assets'
import { formatINR } from '../lib/money'
import './Home.css'

const CARD_IMAGES = {
  mens: IMG_MENS_INTERIOR,
  unisex: IMG_UNISEX,
  parlour: IMG_PARLOUR,
}

export default function Home() {
  const navigate = useNavigate()
  const { publicSalons, isFirstBooking, isSignedIn, settings } = useApp()
  const { city, setCategory } = usePrefs()
  const [openFaq, setOpenFaq] = useState(0)

  const inCity = publicSalons.filter((s) => s.city === city.id)
  const featured = [...inCity].sort((a, b) => b.rating - a.rating).slice(0, 3)
  const showComingSoon = inCity.length === 0 && settings.comingSoonEnabled

  const goCategory = (id) => {
    setCategory(id)
    navigate('/salons')
  }

  const openSalon = (salon) => navigate(`/salon/${salon.id}`)

  const [mens, unisex, parlour] = ['mens', 'unisex', 'parlour'].map((id) =>
    CATEGORIES.find((c) => c.id === id),
  )

  return (
    <>
      {/* ---------------- Choose your salon ---------------- */}
      <section className="choose">
        <div className="choose__ornament choose__ornament--l" aria-hidden="true" />
        <div className="choose__ornament choose__ornament--r" aria-hidden="true" />

        <div className="shell choose__inner">
          <div className="choose__head anim-up">
            <div className="eyebrow">{BRAND.tagline}</div>
            <h1 className="display choose__title">Choose Your Salon</h1>
            <p className="lede choose__lede">
              Select your preferred salon experience for tailored services &amp; expert care
              in {city.label}.
            </p>
            {!isSignedIn && (
              <p className="choose__offer">
                <strong>10% off</strong> your first booking when you pay online
              </p>
            )}
          </div>

          <div className="choose__cards">
            {[mens, unisex].map((cat, i) => (
              <Reveal
                key={cat.id}
                className="pick"
                style={{ transitionDelay: `${i * 90}ms` }}
              >
                <button
                  type="button"
                  className="pick__btn"
                  onClick={() => goCategory(cat.id)}
                  aria-label={`${cat.label} — ${cat.blurb}`}
                >
                  <span className="pick__media">
                    <img src={CARD_IMAGES[cat.id]} alt="" aria-hidden="true" />
                  </span>
                  <span className="pick__body">
                    <span className="pick__name">{cat.label}</span>
                    <span className="pick__blurb">{cat.blurb}</span>
                    <span className="pick__cta">Explore →</span>
                  </span>
                </button>
              </Reveal>
            ))}
          </div>
        </div>

        {/* ---- Featured: beauty parlour ---- */}
        <div className="feature">
          <div className="shell">
            <div className="feature__label">Featured services</div>
            <Reveal className="feature__card">
              <img className="feature__img" src={CARD_IMAGES.parlour} alt="" aria-hidden="true" />
              <div className="feature__scrim" />
              <div className="feature__content">
                <h2 className="display feature__title">{parlour.label}</h2>
                <p className="feature__text">{parlour.blurb}</p>
                <button
                  type="button"
                  className="btn btn--gold"
                  onClick={() => goCategory(parlour.id)}
                >
                  Book now →
                </button>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------------- Featured salons ---------------- */}
      <section className="shell section">
        <Reveal className="section__head">
          <div>
            <div className="eyebrow">Top rated</div>
            <h2 className="section-title">Salons in {city.label}</h2>
          </div>
          {!showComingSoon && (
            <button type="button" className="section__more" onClick={() => navigate('/salons')}>
              View all {inCity.length}
            </button>
          )}
        </Reveal>

        {showComingSoon && (
          <div className="empty">
            <h3 className="empty__title">Coming soon in {city.label}</h3>
            <p className="empty__text">
              {settings.comingSoonMessage ||
                'We’re onboarding great salons near you — check back soon.'}
            </p>
          </div>
        )}

        <div className="grid3">
          {featured.map((salon, i) => (
            <Reveal
              key={salon.id}
              className="salonCard"
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <button
                type="button"
                className="salonCard__btn"
                onClick={() => openSalon(salon)}
                aria-label={`${salon.name}, ${salon.area}, rated ${salon.rating}, from ${formatINR(salon.from)}`}
              >
                <span className="salonCard__media">
                  <img src={salon.img} alt="" aria-hidden="true" loading="lazy" />
                  <span className="salonCard__badge">{salon.badge}</span>
                </span>
                <span className="salonCard__body">
                  <span className="salonCard__row">
                    <span className="salonCard__name">{salon.name}</span>
                    <span className="salonCard__rating">★ {salon.rating.toFixed(1)}</span>
                  </span>
                  <span className="salonCard__meta">
                    {salon.area} · {salon.dist} · {salon.reviews} reviews
                  </span>
                  <span className="salonCard__modes">
                    {salon.serviceModes.includes('salon') && <span className="tag">At salon</span>}
                    {salon.serviceModes.includes('home') && <span className="tag">Home service</span>}
                  </span>
                  <span className="salonCard__foot">
                    <span className="salonCard__price money">
                      from <strong>{formatINR(salon.from)}</strong>
                    </span>
                    <span className="salonCard__open">Open till {salon.closes}</span>
                  </span>
                </span>
              </button>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------- How it works ---------------- */}
      <section className="how">
        <div className="shell">
          <Reveal className="section__centered">
            <div className="eyebrow">How it works</div>
            <h2 className="section-title">Three steps, sixty seconds</h2>
          </Reveal>
          <div className="grid3 how__steps">
            {STEPS.map((step, i) => (
              <Reveal
                key={step.n}
                className="how__step"
                style={{ transitionDelay: `${i * 90}ms` }}
              >
                <div className="how__n">{step.n}</div>
                <h3 className="how__stepTitle">{step.title}</h3>
                <p className="how__stepBody">{step.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Testimonials ---------------- */}
      <section className="shell section">
        <Reveal className="section__centered">
          <div className="eyebrow">Testimonials</div>
          <h2 className="section-title">What members say</h2>
        </Reveal>
        <div className="grid3">
          {TESTIMONIALS.map((t, i) => (
            <Reveal
              key={t.name}
              className="card quote"
              style={{ transitionDelay: `${i * 90}ms` }}
            >
              <div className="quote__stars" aria-label="Rated 5 out of 5">
                ★★★★★
              </div>
              <blockquote className="quote__text">“{t.quote}”</blockquote>
              <div className="quote__name">{t.name}</div>
              <div className="quote__meta">{t.meta}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------- FAQ ---------------- */}
      <section className="shell shell--narrow faq">
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
    </>
  )
}
