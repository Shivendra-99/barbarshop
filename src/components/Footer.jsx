import { Link } from 'react-router-dom'
import { BRAND, TRUST_POINTS } from '../data/seed'
import { useApp } from '../store/AppStore'
import { useT } from '../lib/i18n'
import LogoMark from './LogoMark'
import './Footer.css'

const COLUMNS = [
  {
    titleKey: 'ftr.menu',
    links: [
      { key: 'nav.home', to: '/' },
      { key: 'nav.book', to: '/salons' },
      { key: 'nav.help', to: '/help' },
      { key: 'nav.account', to: 'account' },
    ],
  },
  {
    titleKey: 'ftr.book',
    links: [
      { key: 'ftr.allSalons', to: '/salons' },
      { key: 'ftr.myBookings', to: '/appointments' },
      { key: 'ftr.wallet', to: '/wallet' },
    ],
  },
  {
    titleKey: 'ftr.forSalons',
    links: [
      { key: 'ftr.listSalon', to: '/owner/add' },
      { key: 'ftr.ownerDashboard', to: '/owner' },
      { key: 'ftr.admin', to: '/admin' },
    ],
  },
  {
    titleKey: 'ftr.company',
    links: [
      { key: 'ftr.helpCentre', to: '/help' },
      { key: 'ftr.about', to: '/about-us' },
      { key: 'ftr.contact', to: '/contact-us' },
      { key: 'ftr.refund', to: '/refund-policy' },
      { key: 'ftr.privacy', to: '/privacy-policy' },
      { key: 'ftr.terms', to: '/terms-and-conditions' },
    ],
  },
]

export default function Footer() {
  const { isSignedIn } = useApp()
  const t = useT()
  const resolve = (to) => (to === 'account' ? (isSignedIn ? '/account' : '/login') : to)

  return (
    <footer className="ftr">
      <div className="ftr__trust">
        <div className="shell ftr__trustRow">
          {TRUST_POINTS.map((point, i) => (
            <span key={point} className="ftr__trustItem">
              <span className="ftr__trustDot" aria-hidden="true" />
              {t(`trust.${i + 1}`)}
            </span>
          ))}
        </div>
      </div>

      <div className="shell ftr__grid">
        <div>
          <div className="ftr__word">
            <LogoMark className="ftr__mark" />
            {BRAND.name}
          </div>
          <p className="ftr__blurb">{t('home.tagline')}</p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.titleKey}>
            <div className="ftr__heading">{t(col.titleKey)}</div>
            <ul className="ftr__links">
              {col.links.map((l) => (
                <li key={l.key}>
                  <Link to={resolve(l.to)}>{t(l.key)}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="shell ftr__base">
        <div>© {new Date().getFullYear()} {BRAND.name}</div>
        <div className="ftr__legal">
          <Link to="/privacy-policy">{t('ftr.privacy')}</Link>
          <span aria-hidden="true"> · </span>
          <Link to="/terms-and-conditions">{t('ftr.terms')}</Link>
        </div>
      </div>
    </footer>
  )
}
