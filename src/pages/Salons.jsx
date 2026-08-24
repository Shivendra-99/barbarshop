import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Reveal from '../components/Reveal'
import { useApp } from '../store/AppStore'
import { usePrefs } from '../store/Prefs'
import { CATEGORIES } from '../data/seed'
import { formatINR } from '../lib/money'
import './Salons.css'

const SORTS = [
  { id: 'rating', label: 'Top rated' },
  { id: 'price', label: 'Price: low to high' },
  { id: 'distance', label: 'Nearest' },
]

const MODE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'salon', label: 'At salon' },
  { id: 'home', label: 'Home service' },
]

export default function Salons() {
  const navigate = useNavigate()
  const { publicSalons } = useApp()
  const { city, category, setCategory } = usePrefs()
  const [mode, setMode] = useState('all')
  const [sort, setSort] = useState('rating')

  const results = useMemo(() => {
    let list = publicSalons.filter((s) => s.city === city.id)
    if (category) list = list.filter((s) => s.category === category)
    if (mode !== 'all') list = list.filter((s) => s.serviceModes.includes(mode))

    const sorted = [...list]
    if (sort === 'rating') sorted.sort((a, b) => b.rating - a.rating)
    if (sort === 'price') sorted.sort((a, b) => a.from - b.from)
    if (sort === 'distance') sorted.sort((a, b) => parseFloat(a.dist) - parseFloat(b.dist))
    return sorted
  }, [publicSalons, city.id, category, mode, sort])

  const activeCategory = CATEGORIES.find((c) => c.id === category)

  return (
    <div className="shell salons">
      <div className="salons__head">
        <div>
          <div className="eyebrow">{city.label}</div>
          <h1 className="display salons__title">
            {activeCategory ? activeCategory.label : 'All salons'}
          </h1>
          <p className="lede salons__lede">
            {results.length} {results.length === 1 ? 'salon' : 'salons'} available
            {activeCategory ? ` · ${activeCategory.short}` : ''}
          </p>
        </div>

        <label className="salons__sort">
          <span className="sr-only">Sort salons</span>
          <select
            className="salons__select"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
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
            All types
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              className="chip"
              aria-pressed={category === c.id}
              onClick={() => setCategory(c.id)}
            >
              {c.label}
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
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {results.length === 0 ? (
        <div className="empty">
          <h2 className="empty__title">No salons match those filters</h2>
          <p className="empty__text">
            Try a different salon type or service location in {city.label}.
          </p>
          <button
            type="button"
            className="btn btn--ghost-gold"
            onClick={() => {
              setCategory(null)
              setMode('all')
            }}
          >
            Clear filters
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
                    {salon.serviceModes.includes('home') && (
                      <span className="tag">Home service</span>
                    )}
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
      )}
    </div>
  )
}
