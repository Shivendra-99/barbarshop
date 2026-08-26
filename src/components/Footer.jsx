import { Link } from 'react-router-dom'
import { BRAND, TRUST_POINTS } from '../data/seed'
import './Footer.css'

const COLUMNS = [
  {
    title: 'Book',
    links: [
      { label: 'All salons', to: '/salons' },
      { label: 'My bookings', to: '/appointments' },
      { label: 'Wallet', to: '/wallet' },
    ],
  },
  {
    title: 'For salons',
    links: [
      { label: 'List your salon', to: '/owner/add' },
      { label: 'Owner dashboard', to: '/owner' },
      { label: 'Admin', to: '/admin' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Help centre', to: '/help' },
      { label: 'About', to: '/help' },
      { label: 'Contact', to: '/help' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="ftr">
      <div className="ftr__trust">
        <div className="shell ftr__trustRow">
          {TRUST_POINTS.map((t) => (
            <span key={t} className="ftr__trustItem">
              <span className="ftr__trustDot" aria-hidden="true" />
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="shell ftr__grid">
        <div>
          <div className="ftr__word">{BRAND.name}</div>
          <p className="ftr__blurb">{BRAND.tagline}</p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <div className="ftr__heading">{col.title}</div>
            <ul className="ftr__links">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link to={l.to}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="shell ftr__base">
        <div>© {new Date().getFullYear()} {BRAND.name}</div>
        <div>Privacy · Terms</div>
      </div>
    </footer>
  )
}
