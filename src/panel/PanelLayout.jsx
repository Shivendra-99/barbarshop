import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppStore'
import { BRAND } from '../data/seed'
import './PanelLayout.css'

/* Sidebar navigation per role. `end` marks exact-match links. */
const NAV = {
  founder: {
    label: 'Super Admin',
    items: [
      { to: '/admin', label: 'Dashboard', end: true, icon: 'grid' },
      { to: '/admin/salons', label: 'Salons', icon: 'store', end: true },
      { to: '/admin/salons/new', label: 'Add salon', icon: 'plus', end: true },
      { to: '/admin/owners', label: 'Owners', icon: 'users' },
      { to: '/admin/bookings', label: 'Bookings', icon: 'calendar' },
    ],
  },
  owner: {
    label: 'Salon Owner',
    items: [
      { to: '/owner', label: 'Dashboard', end: true, icon: 'grid' },
      { to: '/owner/add', label: 'Add salon', icon: 'plus' },
      { to: '/owner/services', label: 'Services', icon: 'store' },
      { to: '/owner/bookings', label: 'Bookings', icon: 'calendar' },
    ],
  },
}

const ICONS = {
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  store: 'M4 9V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3M4 9h16M4 9l1 11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1l1-11',
  calendar: 'M4 6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM4 9h16M8 3v4M16 3v4',
  plus: 'M12 5v14M5 12h14',
  users:
    'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2.5 20a6.5 6.5 0 0 1 13 0M17 4.5a3.5 3.5 0 0 1 0 6.9M18 14a6.5 6.5 0 0 1 3.5 6',
}

function Icon({ name }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="pnl__icon">
      <path
        d={ICONS[name]}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function PanelLayout({ role }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { session, logout, unreadCount, myNotifications, markRead } = useApp()
  const [mobileNav, setMobileNav] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)
  const bellRef = useRef(null)

  const nav = NAV[role]
  const active = [...nav.items]
    .sort((a, b) => b.to.length - a.to.length)
    .find((i) => (i.end ? location.pathname === i.to : location.pathname.startsWith(i.to)))
  const pageTitle = active?.label ?? 'Dashboard'

  // Close mobile nav on route change.
  useEffect(() => {
    setMobileNav(false)
  }, [location.pathname])

  useEffect(() => {
    if (!bellOpen) return undefined
    const onPointer = (e) => {
      if (!bellRef.current?.contains(e.target)) setBellOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [bellOpen])

  const openBell = () => {
    setBellOpen((v) => !v)
    if (!bellOpen) markRead()
  }

  const signOut = () => {
    logout()
    navigate('/')
  }

  const initials = (session?.name ?? 'U')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="pnl" data-theme="admin">
      {/* ---- Sidebar ---- */}
      <aside className={`pnl__side${mobileNav ? ' is-open' : ''}`}>
        <div className="pnl__brand">
          <svg className="pnl__logo" viewBox="0 0 28 28" aria-hidden="true">
            <path d="M14 3c2.6 3.4 4 6.4 4 9a4 4 0 0 1-8 0c0-2.6 1.4-5.6 4-9Z" fill="currentColor" opacity=".9" />
            <path
              d="M6.5 14.5c3.6.9 6.1 2.3 7.5 4.2 1.4-1.9 3.9-3.3 7.5-4.2-1.6 5-4.1 7.9-7.5 10.3-3.4-2.4-5.9-5.3-7.5-10.3Z"
              fill="currentColor"
              opacity=".55"
            />
          </svg>
          <div>
            <div className="pnl__brandName">{BRAND.name}</div>
            <div className="pnl__brandRole">{nav.label}</div>
          </div>
        </div>

        <nav className="pnl__nav">
          {nav.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `pnl__link${isActive ? ' is-active' : ''}`}
            >
              <Icon name={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="pnl__sideFoot">
          <NavLink to="/" className="pnl__link pnl__link--muted">
            <Icon name="store" />
            Back to site
          </NavLink>
          <button type="button" className="pnl__link pnl__link--muted" onClick={signOut}>
            <svg viewBox="0 0 24 24" aria-hidden="true" className="pnl__icon">
              <path
                d="M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3M10 12h9M16 9l3 3-3 3"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Log out
          </button>
        </div>
      </aside>

      {mobileNav && (
        <button
          type="button"
          className="pnl__scrim"
          aria-label="Close menu"
          onClick={() => setMobileNav(false)}
        />
      )}

      {/* ---- Main ---- */}
      <div className="pnl__main">
        <header className="pnl__top">
          <button
            type="button"
            className="pnl__burger"
            aria-label="Open menu"
            aria-expanded={mobileNav}
            onClick={() => setMobileNav(true)}
          >
            <span />
            <span />
            <span />
          </button>

          <h1 className="pnl__title">{pageTitle}</h1>

          <div className="pnl__topRight">
            <div className="pnl__bell" ref={bellRef}>
              <button
                type="button"
                className="pnl__iconBtn"
                aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
                aria-expanded={bellOpen}
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
                  <path d="M8 15.5a2 2 0 0 0 4 0" fill="none" stroke="currentColor" strokeWidth="1.4" />
                </svg>
                {unreadCount > 0 && <span className="pnl__badge">{unreadCount}</span>}
              </button>
              {bellOpen && (
                <div className="pnl__pop">
                  <div className="pnl__popHead">Notifications</div>
                  {myNotifications.length === 0 ? (
                    <p className="pnl__popEmpty">Nothing yet.</p>
                  ) : (
                    <ul className="pnl__popList">
                      {myNotifications.slice(0, 8).map((n) => (
                        <li key={n.id} className={`pnl__note pnl__note--${n.tone}`}>
                          <div className="pnl__noteTitle">{n.title}</div>
                          <div className="pnl__noteBody">{n.body}</div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="pnl__user">
              <span className="pnl__avatar">{initials}</span>
              <span className="pnl__userMeta">
                <span className="pnl__userName">{session?.name}</span>
                <span className="pnl__userRole">{nav.label}</span>
              </span>
            </div>
          </div>
        </header>

        <div className="pnl__content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
