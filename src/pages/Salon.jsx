import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../store/AppStore'
import { useT } from '../lib/i18n'
import { categoryById } from '../data/seed'
import { api } from '../lib/api'
import { formatINR } from '../lib/money'
import './Salon.css'

const TABS = [
  { key: 'services', labelKey: 'salon.tabServices' },
  { key: 'team', labelKey: 'salon.tabTeam' },
  { key: 'about', labelKey: 'salon.tabAbout' },
]

export default function Salon() {
  const { salonId } = useParams()
  const navigate = useNavigate()
  const { publicSalons, salonsReady, isFirstBooking, isSignedIn } = useApp()
  const t = useT()
  const [tab, setTab] = useState('services')

  const salon = publicSalons.find((s) => s.id === salonId)

  // The salon's own menu, loaded from the API.
  const [services, setServices] = useState([])
  const [loadingSvc, setLoadingSvc] = useState(true)

  useEffect(() => {
    if (!salonId) return undefined
    let alive = true
    setLoadingSvc(true)
    api
      .salonServices(salonId)
      .then((res) => alive && setServices(res.services))
      .catch(() => alive && setServices([]))
      .finally(() => alive && setLoadingSvc(false))
    return () => {
      alive = false
    }
  }, [salonId])

  const fromPrice = useMemo(
    () => (services.length ? Math.min(...services.map((s) => s.amount)) : salon?.from ?? 0),
    [services, salon],
  )

  // Wait for the salon list before deciding — a direct link lands here before
  // the fetch resolves, and redirecting early would bounce a valid URL.
  if (!salon && !salonsReady) {
    return (
      <div className="route-loading" role="status" aria-live="polite">
        <span className="route-loading__spinner" aria-hidden="true" />
        <span className="sr-only">Loading…</span>
      </div>
    )
  }
  // A salon can be un-listed by the founder while someone holds the link.
  if (!salon) return <Navigate to="/salons" replace />

  const category = categoryById(salon.category)
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
              {t('salon.ratingReviews', { rating: salon.rating.toFixed(1), reviews: salon.reviews })}
            </span>
            <span>{salon.address}</span>
            <span className="salon__open">
              {t('salon.openHours', { opens: salon.opens, closes: salon.closes })}
            </span>
          </div>
          <div className="salon__modes">
            {salon.serviceModes.map((m) => (
              <span key={m} className="badge badge--gold">
                {t(`mode.${m}`)}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="shell salon__grid">
        <div className="salon__main">
          <div className="tabs salon__tabs" role="tablist">
            {TABS.map((tb) => (
              <button
                key={tb.key}
                type="button"
                role="tab"
                className="tab"
                aria-selected={tab === tb.key}
                onClick={() => setTab(tb.key)}
              >
                {t(tb.labelKey)}
              </button>
            ))}
          </div>

          {tab === 'services' &&
            (loadingSvc ? (
              <p className="svcList__loading">{t('salon.loadingMenu')}</p>
            ) : services.length === 0 ? (
              <p className="svcList__loading">{t('salon.noServices')}</p>
            ) : (
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
                        <div className="svc__dur">{s.mins} {t('salon.min')}</div>
                      </div>
                      <button
                        type="button"
                        className="btn btn--ghost-gold btn--sm"
                        onClick={() => book(s.id)}
                      >
                        {t('salon.book')}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ))}

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
                {t('salon.aboutText', {
                  name: salon.name,
                  category: t(`cat.${salon.category}.label`),
                  area: salon.area,
                  services: t(`cat.${salon.category}.blurb`).toLowerCase(),
                  rating: salon.rating.toFixed(1),
                  reviews: salon.reviews,
                })}
              </p>
              <dl className="about__list">
                <div className="about__row">
                  <dt>{t('salon.address')}</dt>
                  <dd>{salon.address}</dd>
                </div>
                <div className="about__row">
                  <dt>{t('salon.hours')}</dt>
                  <dd>{t('salon.hoursDaily', { opens: salon.opens, closes: salon.closes })}</dd>
                </div>
                <div className="about__row">
                  <dt>{t('salon.serviceOptions')}</dt>
                  <dd>{salon.serviceModes.map((m) => t(`mode.${m}`)).join(' · ')}</dd>
                </div>
                {offersHome && (
                  <div className="about__row">
                    <dt>{t('salon.homeFee')}</dt>
                    <dd className="money">{formatINR(salon.homeServiceFee)}</dd>
                  </div>
                )}
                <div className="about__row">
                  <dt>{t('salon.payment')}</dt>
                  <dd>{t('salon.payLine')}</dd>
                </div>
              </dl>
            </div>
          )}
        </div>

        <aside className="rail">
          <div className="eyebrow">{t('salon.bookAppt')}</div>
          <div className="rail__price money">
            {t('salon.fromPrice', { price: formatINR(fromPrice) })}
          </div>

          {isFirstBooking && (
            <div className="rail__offer">
              <strong>{t('home.offerStrong')}</strong> {t('home.offerRest')}.
            </div>
          )}

          <button type="button" className="btn btn--gold btn--block" onClick={() => book(null)}>
            {isSignedIn ? t('salon.chooseSlot') : t('salon.loginToBook')}
          </button>

          <ul className="rail__modes">
            {salon.serviceModes.map((m) => (
              <li key={m}>
                <span className="rail__modeLabel">{t(`mode.${m}`)}</span>
                <span className="rail__modeNote">
                  {m === 'home' && salon.homeServiceFee > 0
                    ? `${t('mode.homeNote')} ${t('book.travel', { fee: formatINR(salon.homeServiceFee) })}`
                    : t(`mode.${m}Note`)}
                </span>
              </li>
            ))}
          </ul>

          <div className="rail__note">{t('salon.freeCancel')}</div>
        </aside>
      </div>
    </div>
  )
}
