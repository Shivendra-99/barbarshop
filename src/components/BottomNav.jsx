import { NavLink } from 'react-router-dom'
import { useApp } from '../store/AppStore'
import './BottomNav.css'

const ICONS = {
  home: (
    <path
      d="M4 11.5 12 4l8 7.5M6 10v9h5v-5h2v5h5v-9"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  book: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M4 9h16M8 3v4M16 3v4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M9.6 9.4a2.5 2.5 0 0 1 4.9.6c0 1.7-2.5 2-2.5 3.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <circle cx="12" cy="16.6" r="1" fill="currentColor" />
    </>
  ),
  account: (
    <>
      <circle cx="12" cy="8.2" r="3.4" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M5.5 19.5c.8-3.6 3.4-5.4 6.5-5.4s5.7 1.8 6.5 5.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </>
  ),
}

function Tab({ to, end, icon, label }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `btmnav__tab${isActive ? ' is-active' : ''}`}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="btmnav__icon">
        {ICONS[icon]}
      </svg>
      <span className="btmnav__label">{label}</span>
    </NavLink>
  )
}

/**
 * Mobile-only bottom navigation bar. Hidden on tablet/desktop (the header nav
 * takes over there). Account routes to /account when signed in, else /login.
 */
export default function BottomNav() {
  const { isSignedIn } = useApp()

  return (
    <nav className="btmnav" aria-label="Primary">
      <Tab to="/" end icon="home" label="Home" />
      <Tab to="/salons" icon="book" label="Book" />
      <Tab to="/help" icon="help" label="Help" />
      <Tab to={isSignedIn ? '/account' : '/login'} icon="account" label="Account" />
    </nav>
  )
}
