import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppStore'
import { usePrefs, THEMES } from '../store/Prefs'
import { BRAND, CITIES } from '../data/seed'
import { formatINR } from '../lib/money'
import './Header.css'

const THEME_ICONS = {
  light: (
    <>
      <circle cx="10" cy="10" r="3.6" fill="currentColor" />
      <path
        d="M10 1.6v2.2M10 16.2v2.2M18.4 10h-2.2M3.8 10H1.6M15.9 4.1l-1.6 1.6M5.7 14.3l-1.6 1.6M15.9 15.9l-1.6-1.6M5.7 5.7 4.1 4.1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </>
  ),
  dark: (
    <path
      d="M16 11.6A6.6 6.6 0 0 1 8.4 4a6.9 6.9 0 1 0 7.6 7.6Z"
      fill="currentColor"
    />
  ),
}

const LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/salons', label: 'Book' },
  { to: '/appointments', label: 'My bookings' },
  { to: '/help', label: 'Help' },
]

function Panel({ open, onClose, children, className }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onPointer = (e) => {
      if (!ref.current?.contains(e.target)) onClose()
    }
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div ref={ref} className={`pop ${className ?? ''}`.trim()}>
      {children}
    </div>
  )
}

export default function Header({ city, onCityChange }) {
  const navigate = useNavigate()
  const { isSignedIn, session, logout, unreadCount, myNotifications, markRead, walletBalance } =
    useApp()
  const { theme, setTheme, resolvedTheme } = usePrefs()

  const [menu, setMenu] = useState(null) // 'city' | 'bell' | 'account' | null
  const [mobileOpen, setMobileOpen] = useState(false)

  const toggle = (name) => setMenu((m) => (m === name ? null : name))
  const close = () => setMenu(null)

  const openBell = () => {
    toggle('bell')
    if (menu !== 'bell') markRead()
  }

  const signOut = () => {
    logout()
    close()
    setMobileOpen(false)
    navigate('/')
  }

  return (
    <header className="hdr">
      {/* ---- Location strip ---- */}
      <div className="hdr__strip">
        <div className="hdr__stripInner">
          <div className="sel-wrap">
            <button
              type="button"
              className="hdr__city"
              aria-haspopup="listbox"
              aria-expanded={menu === 'city'}
              onClick={() => toggle('city')}
            >
              <svg viewBox="0 0 16 16" aria-hidden="true" className="hdr__pin">
                <path
                  d="M8 1.5c-2.5 0-4.5 2-4.5 4.5 0 3.2 4.5 8.5 4.5 8.5s4.5-5.3 4.5-8.5c0-2.5-2-4.5-4.5-4.5Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.3"
                />
                <circle cx="8" cy="6" r="1.6" fill="currentColor" />
              </svg>
              <span>
                {BRAND.name} · {city.label} {city.pin}
              </span>
              <span className="hdr__caret" aria-hidden="true">
                ▾
              </span>
            </button>
            <Panel open={menu === 'city'} onClose={close} className="pop--city">
              <ul role="listbox" aria-label="Choose city">
                {CITIES.map((c) => (
                  <li key={c.id} role="none">
                    <button
                      type="button"
                      role="option"
                      aria-selected={c.id === city.id}
                      aria-label={c.label}
                      className={`pop__opt${c.id === city.id ? ' is-selected' : ''}`}
                      onClick={() => {
                        onCityChange(c.id)
                        close()
                      }}
                    >
                      <span>{c.label}</span>
                      <span className="pop__hint">{c.areas}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </div>
      </div>

      {/* ---- Main bar ---- */}
      <div className="hdr__bar">
        <Link to="/" className="hdr__brand" onClick={() => setMobileOpen(false)}>
          <svg className="hdr__mark" viewBox="0 0 28 28" aria-hidden="true">
            <path
              d="M14 3c2.6 3.4 4 6.4 4 9a4 4 0 0 1-8 0c0-2.6 1.4-5.6 4-9Z"
              fill="currentColor"
              opacity=".9"
            />
            <path
              d="M6.5 14.5c3.6.9 6.1 2.3 7.5 4.2 1.4-1.9 3.9-3.3 7.5-4.2-1.6 5-4.1 7.9-7.5 10.3-3.4-2.4-5.9-5.3-7.5-10.3Z"
              fill="currentColor"
              opacity=".55"
            />
          </svg>
          <span className="hdr__word">{BRAND.name}</span>
        </Link>

        <button
          type="button"
          className="hdr__burger"
          aria-expanded={mobileOpen}
          aria-controls="hdr-nav"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMobileOpen((v) => !v)}
        >
          <span className={mobileOpen ? 'is-open' : ''} />
        </button>

        <nav id="hdr-nav" className={`hdr__nav${mobileOpen ? ' is-open' : ''}`}>
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => `hdr__link${isActive ? ' is-active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              {l.label}
            </NavLink>
          ))}

          <div className="hdr__actions">
            <div className="sel-wrap">
              <button
                type="button"
                className="hdr__icon"
                aria-haspopup="true"
                aria-expanded={menu === 'theme'}
                aria-label={`Theme: ${theme}. Change appearance`}
                onClick={() => toggle('theme')}
              >
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  {THEME_ICONS[resolvedTheme] ?? THEME_ICONS.light}
                </svg>
              </button>
              <Panel open={menu === 'theme'} onClose={close} className="pop--theme">
                <div className="pop__head">Appearance</div>
                <ul role="listbox" aria-label="Appearance">
                  {THEMES.map((t) => (
                    <li key={t.id} role="none">
                      <button
                        type="button"
                        role="option"
                        aria-selected={theme === t.id}
                        aria-label={t.label}
                        className={`pop__link${theme === t.id ? ' is-selected' : ''}`}
                        onClick={() => {
                          setTheme(t.id)
                          close()
                        }}
                      >
                        <span>{t.label}</span>
                        {t.id === 'system' && (
                          <span className="pop__hint">
                            Currently {resolvedTheme}
                          </span>
                        )}
                        {theme === t.id && (
                          <svg className="pop__tick" viewBox="0 0 14 14" aria-hidden="true">
                            <path
                              d="M2 7.5 5.5 11 12 3.5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                            />
                          </svg>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>

            {isSignedIn && (
              <div className="sel-wrap hdr__bellWrap">
                <button
                  type="button"
                  className="hdr__icon"
                  aria-haspopup="true"
                  aria-expanded={menu === 'bell'}
                  aria-label={
                    unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'
                  }
                  onClick={openBell}
                >
                  <svg viewBox="0 0 20 20" aria-hidden="true">
                    <path
                      d="M10 2.5a4.5 4.5 0 0 0-4.5 4.5v3L4 13h12l-1.5-3V7A4.5 4.5 0 0 0 10 2.5Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M8 15.5a2 2 0 0 0 4 0"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.4"
                    />
                  </svg>
                  {unreadCount > 0 && <span className="hdr__dot">{unreadCount}</span>}
                </button>
                <Panel open={menu === 'bell'} onClose={close} className="pop--bell">
                  <div className="pop__head">Notifications</div>
                  {myNotifications.length === 0 ? (
                    <p className="pop__empty">Nothing yet. Your bookings will show up here.</p>
                  ) : (
                    <ul className="pop__list">
                      {myNotifications.slice(0, 8).map((n) => (
                        <li key={n.id} className={`pop__note pop__note--${n.tone}`}>
                          <div className="pop__noteTitle">{n.title}</div>
                          <div className="pop__noteBody">{n.body}</div>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
              </div>
            )}

            {isSignedIn ? (
              <div className="sel-wrap">
                <button
                  type="button"
                  className="hdr__account"
                  aria-haspopup="true"
                  aria-expanded={menu === 'account'}
                  onClick={() => toggle('account')}
                >
                  <span className="hdr__avatar" aria-hidden="true">
                    {(session.name || 'G').charAt(0).toUpperCase()}
                  </span>
                  <span className="hdr__accountName">{session.name}</span>
                  <span className="hdr__caret" aria-hidden="true">
                    ▾
                  </span>
                </button>
                <Panel open={menu === 'account'} onClose={close} className="pop--account">
                  <div className="pop__user">
                    <div className="pop__userName">{session.name}</div>
                    <div className="pop__userPhone">+91 {session.phone}</div>
                  </div>
                  {session.role === 'founder' && (
                    <Link to="/admin" className="pop__link" onClick={close}>
                      Admin dashboard
                    </Link>
                  )}
                  {session.role === 'owner' && (
                    <Link to="/owner" className="pop__link" onClick={close}>
                      Owner dashboard
                    </Link>
                  )}
                  <Link to="/appointments" className="pop__link" onClick={close}>
                    My bookings
                  </Link>
                  <Link to="/wallet" className="pop__link" onClick={close}>
                    Wallet
                    <span className="pop__badge money">{formatINR(walletBalance)}</span>
                  </Link>
                  <Link to="/account" className="pop__link" onClick={close}>
                    Account
                  </Link>
                  <button type="button" className="pop__link pop__link--danger" onClick={signOut}>
                    Log out
                  </button>
                </Panel>
              </div>
            ) : (
              <Link
                to="/login"
                className="btn btn--gold hdr__cta"
                onClick={() => setMobileOpen(false)}
              >
                <svg viewBox="0 0 16 16" aria-hidden="true" className="hdr__ctaIcon">
                  <circle cx="8" cy="5.5" r="2.8" fill="currentColor" />
                  <path d="M2.5 14c.6-3 2.9-4.5 5.5-4.5S13 11 13.5 14Z" fill="currentColor" />
                </svg>
                Login
              </Link>
            )}
          </div>
        </nav>
      </div>
    </header>
  )
}
