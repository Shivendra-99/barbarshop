import { useState } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import './Header.css'

const LINKS = [
  { to: '/explore', label: 'Explore' },
  { to: '/shop', label: 'Shops' },
  { to: '/appointments', label: 'My appointments' },
  { to: '/dashboard', label: 'For barbers' },
]

export default function Header() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const book = () => {
    setOpen(false)
    navigate('/booking')
  }

  return (
    <header className="hdr">
      <Link to="/" className="hdr__brand" onClick={() => setOpen(false)}>
        <span className="hdr__mark" aria-hidden="true">
          <span />
        </span>
        <span className="hdr__word">BARBERNOW</span>
      </Link>

      <button
        type="button"
        className="hdr__burger"
        aria-expanded={open}
        aria-controls="hdr-nav"
        aria-label={open ? 'Close menu' : 'Open menu'}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={open ? 'is-open' : ''} />
      </button>

      <nav id="hdr-nav" className={`hdr__nav${open ? ' is-open' : ''}`}>
        {LINKS.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) => `hdr__link${isActive ? ' is-active' : ''}`}
            onClick={() => setOpen(false)}
          >
            {l.label}
          </NavLink>
        ))}
        <div className="hdr__actions">
          <button type="button" className="hdr__link hdr__signin">
            Sign in
          </button>
          <button type="button" className="btn btn--gold hdr__cta" onClick={book}>
            Book now
          </button>
        </div>
      </nav>
    </header>
  )
}
