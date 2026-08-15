import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBooking } from '../state/BookingContext'
import { FILTERS } from '../data/content'
import './Explore.css'

/** Matches the `mapStyle` option from the design source. */
const MAP_STYLES = {
  night: { base: '#0e1113', road: 'rgba(198,161,91,.13)' },
  graphite: { base: '#1a1a1c', road: 'rgba(255,255,255,.09)' },
}

const MAP_STYLE = MAP_STYLES.night

/** Chip predicates — kept beside the labels so the two can't drift apart. */
const CHIP_TESTS = {
  All: () => true,
  'Open now': (s) => /^Next: \d/.test(s.next),
  'Skin fade': (s) => s.tags.includes('Skin fade'),
  'Straight razor': (s) => s.tags.includes('Straight razor'),
  'Under ₹1,000': (s) => s.from < 1000,
  'Top rated': (s) => Number(s.rating) >= 4.9,
}

export default function Explore() {
  const navigate = useNavigate()
  const { city, when, matchingShops, selectShop, serviceFilter } = useBooking()
  const [chip, setChip] = useState('All')
  const [selectedId, setSelectedId] = useState(null)

  const shops = useMemo(
    () => matchingShops.filter(CHIP_TESTS[chip] ?? (() => true)),
    [matchingShops, chip],
  )

  // Keep a valid selection as filters change the visible set.
  useEffect(() => {
    if (shops.length === 0) {
      setSelectedId(null)
    } else if (!shops.some((s) => s.id === selectedId)) {
      setSelectedId(shops[0].id)
    }
  }, [shops, selectedId])

  const selected = shops.find((s) => s.id === selectedId) ?? null

  const openShop = (shop) => {
    selectShop(shop.id)
    navigate(`/shop/${shop.id}`)
  }

  return (
    <div className="explore" style={{ '--map-base': MAP_STYLE.base, '--map-road': MAP_STYLE.road }}>
      {/* ---------------- Results list ---------------- */}
      <div className="explore__list">
        <div className="explore__listHead">
          <h1 className="explore__count">
            {shops.length} {shops.length === 1 ? 'shop' : 'shops'} in {city.label}
          </h1>
          <p className="explore__sub">
            {serviceFilter} · {when}
          </p>
          <div className="explore__filters">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                className="chip"
                aria-pressed={chip === f}
                onClick={() => setChip(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {shops.length === 0 ? (
          <div className="explore__empty">
            <p>No chairs match that combination in {city.label}.</p>
            <button type="button" className="btn btn--ghost-gold" onClick={() => setChip('All')}>
              Clear filters
            </button>
          </div>
        ) : (
          shops.map((shop) => (
            <button
              key={shop.id}
              type="button"
              className={`explore__row${selectedId === shop.id ? ' is-selected' : ''}`}
              aria-pressed={selectedId === shop.id}
              aria-label={`${shop.name}, ${shop.area}, rated ${shop.rating}, from ${shop.price}`}
              onClick={() => setSelectedId(shop.id)}
              onDoubleClick={() => openShop(shop)}
            >
              <img src={shop.img} alt="" aria-hidden="true" loading="lazy" />
              <span className="explore__rowBody">
                <span className="explore__rowTop">
                  <span className="explore__rowName">{shop.name}</span>
                  <span className="explore__rowRating">★ {shop.rating}</span>
                </span>
                <span className="explore__rowMeta">
                  {shop.area} · {shop.dist}
                </span>
                <span className="explore__rowMeta">{shop.services}</span>
                <span className="explore__rowFoot">
                  <span className="explore__rowPrice">{shop.price}</span>
                  <span
                    className={
                      /^Next: \d/.test(shop.next)
                        ? 'explore__rowNext is-soon'
                        : 'explore__rowNext'
                    }
                  >
                    {shop.next}
                  </span>
                </span>
              </span>
            </button>
          ))
        )}
      </div>

      {/* ---------------- Map ---------------- */}
      <div className="map">
        <div className="map__grid" />
        <div className="map__road map__road--h1" />
        <div className="map__road map__road--h2" />
        <div className="map__road map__road--v1" />
        <div className="map__road map__road--v2" />
        <div className="map__park" />
        <div className="map__water" />

        {shops.map((shop) => (
          <button
            key={shop.id}
            type="button"
            className={`map__pin${selectedId === shop.id ? ' is-selected' : ''}`}
            style={{ left: shop.pin.left, top: shop.pin.top }}
            onClick={() => setSelectedId(shop.id)}
            aria-label={`${shop.name}, from ${shop.price}`}
          >
            <span className="map__pinLabel">{shop.price}</span>
            <span className="map__pinStem" />
          </button>
        ))}

        <div className="map__where">
          <span className="map__dot" />
          <span className="map__whereText">{city.label}</span>
          <span className="map__div" />
          <span className="map__whereWhen">{when}</span>
        </div>

        <div className="map__zoom">
          <button type="button" aria-label="Zoom in">
            +
          </button>
          <button type="button" aria-label="Zoom out">
            −
          </button>
        </div>

        {selected && (
          <div className="map__card anim-pop" key={selected.id}>
            <div className="map__cardTop">
              <img src={selected.img} alt="" aria-hidden="true" />
              <div>
                <div className="map__cardName">{selected.name}</div>
                <div className="map__cardMeta">
                  ★ {selected.rating} · {selected.reviews} reviews
                </div>
                <div className="map__cardMeta">
                  {selected.area} · {selected.dist}
                </div>
                <div className="map__cardPrice">from {selected.price}</div>
              </div>
            </div>
            <button
              type="button"
              className="btn btn--gold btn--block map__cardCta"
              onClick={() => openShop(selected)}
            >
              View shop &amp; book
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
