import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Reveal from '../components/Reveal'
import { useApp } from '../store/AppStore'
import { usePrefs } from '../store/Prefs'
import { useT } from '../lib/i18n'
import { CATEGORIES } from '../data/seed'
import { formatINR } from '../lib/money'
import { distanceKm, salonDistance } from '../lib/geo'
import './Salons.css'
import { useSeo } from '../lib/seo'

const SORTS = [
  { id: 'rating', key: 'salons.sortRating' },
  { id: 'price', key: 'salons.sortPrice' },
  { id: 'distance', key: 'salons.sortNearest' },
]

const MODE_FILTERS = [
  { id: 'all', key: 'salons.allModes' },
  { id: 'salon', key: 'card.atSalon' },
  { id: 'home', key: 'card.homeService' },
]

export default function Salons() {
  const navigate = useNavigate()
  const { publicSalons, settings } = useApp()
  const { city, category, setCategory, coords, detectLocation } = usePrefs()
  useSeo({
    title: `Salons in ${city.label} — Book online`,
    description: `Book the best men's salons, unisex salons and beauty parlours in ${city.label}. See prices, pick a slot and skip the wait.`,
    path: '/salons',
  })
  const t = useT()
  const [mode, setMode] = useState('all')
  const [sort, setSort] = useState('rating')

  const results = useMemo(() => {
    let list = publicSalons.filter((s) => s.city === city.id)
    if (category) list = list.filter((s) => s.category === category)
    if (mode !== 'all') list = list.filter((s) => s.serviceModes.includes(mode))

    const sorted = [...list]
    if (sort === 'rating') sorted.sort((a, b) => b.rating - a.rating)
    if (sort === 'price') sorted.sort((a, b) => a.from - b.from)
    // Real distance from the device; salons without a pin (or no location yet) sort last.
    const km = (x) => distanceKm(coords, x.location) ?? Infinity
    if (sort === 'distance') sorted.sort((a, b) => km(a) - km(b))
    return sorted
  }, [publicSalons, city.id, category, mode, sort, coords])

  const activeCategory = CATEGORIES.find((c) => c.id === category)
  const cityHasNoSalons = !publicSalons.some((s) => s.city === city.id)
  const showComingSoon = cityHasNoSalons && settings.comingSoonEnabled

  return (
    <div className="shell salons">
      <div className="salons__head">
        <div>
          <div className="eyebrow">{city.label}</div>
          <h1 className="display salons__title">
            {activeCategory ? t(`cat.${activeCategory.id}.label`) : t('salons.allSalons')}
          </h1>
          <p className="lede salons__lede">
            {results.length === 1
              ? t('salons.availableOne')
              : t('salons.available', { n: results.length })}
          </p>
        </div>

        <label className="salons__sort">
          <span className="sr-only">Sort salons</span>
          <select
            className="salons__select"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value)
              // Nearest needs a position — ask for it once if we don't have one.
              if (e.target.value === 'distance' && !coords) detectLocation().catch(() => {})
            }}
          >
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {t(s.key)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="salons__filters">
        <div className="salons__filterGroup" role="group" aria-label="Salon type">
          <button
            type="button"
            className="chip"
            aria-pressed={!category}
            onClick={() => setCategory(null)}
          >
            {t('salons.allTypes')}
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              className="chip"
              aria-pressed={category === c.id}
              onClick={() => setCategory(c.id)}
            >
              {t(`cat.${c.id}.label`)}
            </button>
          ))}
        </div>

        <div className="salons__filterGroup" role="group" aria-label="Service location">
          {MODE_FILTERS.map((m) => (
            <button
              key={m.id}
              type="button"
              className="chip"
              aria-pressed={mode === m.id}
              onClick={() => setMode(m.id)}
            >
              {t(m.key)}
            </button>
          ))}
        </div>
      </div>

      {showComingSoon ? (
        <div className="empty">
          <h2 className="empty__title">{t('home.comingSoonTitle', { city: city.label })}</h2>
          <p className="empty__text">
            {settings.comingSoonMessage || t('home.comingSoonText')}
          </p>
        </div>
      ) : results.length === 0 ? (
        <div className="empty">
          <h2 className="empty__title">{t('salons.noMatch')}</h2>
          <p className="empty__text">{t('salons.noMatchHint', { city: city.label })}</p>
          <button
            type="button"
            className="btn btn--ghost-gold"
            onClick={() => {
              setCategory(null)
              setMode('all')
            }}
          >
            {t('salons.clearFilters')}
          </button>
        </div>
      ) : (
        <div className="grid3 salons__grid">
          {results.map((salon, i) => (
            <Reveal
              key={salon.id}
              className="salonCard"
              style={{ transitionDelay: `${Math.min(i, 6) * 70}ms` }}
            >
              <button
                type="button"
                className="salonCard__btn"
                onClick={() => navigate(`/salon/${salon.id}`)}
                aria-label={`${salon.name}, ${salon.area}, rated ${salon.rating}, from ${formatINR(salon.from)}`}
              >
                <span className="salonCard__media">
                  <img src={salon.img} alt="" aria-hidden="true" loading="lazy" />
                  <span className="salonCard__badge">{salon.badge}</span>
                  {salon.offerActive && salon.offerPercent > 0 && (
                    <span className="salonCard__offer">
                      {t('card.offerBadge', { pct: salon.offerPercent })}
                    </span>
                  )}
                </span>
                <span className="salonCard__body">
                  <span className="salonCard__row">
                    <span className="salonCard__name">{salon.name}</span>
                    <span className="salonCard__rating">★ {salon.rating.toFixed(1)}</span>
                  </span>
                  <span className="salonCard__meta">
                    {[salon.area, salonDistance(coords, salon), `${salon.reviews} ${t('card.reviews')}`]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                  <span className="salonCard__modes">
                    {salon.serviceModes.includes('salon') && (
                      <span className="tag">{t('card.atSalon')}</span>
                    )}
                    {salon.serviceModes.includes('home') && (
                      <span className="tag">{t('card.homeService')}</span>
                    )}
                  </span>
                  <span className="salonCard__foot">
                    <span className="salonCard__price money">
                      {t('card.from')} <strong>{formatINR(salon.from)}</strong>
                    </span>
                    <span className="salonCard__open">{t('card.openTill', { t: salon.closes })}</span>
                  </span>
                </span>
              </button>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  )
}
