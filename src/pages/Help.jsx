import { Link } from 'react-router-dom'
import { BRAND, FAQS, SUPPORT } from '../data/seed'
import { COMMISSION_RATE, FIRST_BOOKING_DISCOUNT_RATE } from '../lib/pricing'
import './Simple.css'

const HOW_IT_PAYS = [
  {
    title: 'Pay online',
    body: `Settled to ${BRAND.name} at the time of booking. Your first booking gets ${FIRST_BOOKING_DISCOUNT_RATE * 100}% off — once per customer, never on repeat bookings.`,
  },
  {
    title: 'Pay at salon',
    body: 'Cash goes directly to the salon. The booking still records the amount so both you and the salon have a record of it.',
  },
  {
    title: 'Commission',
    body:
      COMMISSION_RATE === 0
        ? 'Salons keep 100% of the service price. There is no platform commission today.'
        : `Salons keep ${(1 - COMMISSION_RATE) * 100}% of the service price.`,
  },
]

export default function Help() {
  return (
    <div className="shell shell--narrow simple">
      <h1 className="display simple__title">Help &amp; support</h1>
      <p className="lede simple__lede">
        Everything about booking, paying and cancelling on {BRAND.name}.
      </p>

      <h2 className="simple__heading">How payment works</h2>
      <div className="payGrid">
        {HOW_IT_PAYS.map((p) => (
          <div key={p.title} className="card payGrid__item">
            <h3 className="payGrid__title">{p.title}</h3>
            <p className="payGrid__body">{p.body}</p>
          </div>
        ))}
      </div>

      <div className="panel wa-panel">
        <div>
          <h2 className="simple__heading" style={{ marginTop: 0 }}>Need help? Chat with us</h2>
          <p className="panel__text">
            Message our support team on WhatsApp — we usually reply within a few minutes.
          </p>
          <p className="panel__text panel__text--fine">{SUPPORT.whatsappDisplay}</p>
        </div>
        <a
          className="btn wa-btn"
          href={SUPPORT.whatsappUrl('Hi SalonSathi, I need help with ')}
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18">
            <path
              fill="currentColor"
              d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.9 5-1.3A10 10 0 1 0 12 2Zm5.8 14.2c-.2.7-1.4 1.3-2 1.4-.5.1-1.2.1-1.9-.1-.4-.1-1-.3-1.7-.6-3-1.3-4.9-4.3-5.1-4.5-.1-.2-1.2-1.6-1.2-3 0-1.4.7-2.1 1-2.4.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.4.5-.3.3c-.2.2-.3.4-.2.6.2.4.8 1.3 1.6 2 1 .9 1.9 1.2 2.2 1.3.2.1.4.1.6-.1l.7-.9c.2-.2.4-.2.6-.1l1.9.9c.3.1.4.2.5.3.1.2.1.8-.1 1.5Z"
            />
          </svg>
          Chat on WhatsApp
        </a>
      </div>

      <h2 className="simple__heading">Common questions</h2>
      <dl className="helpFaq">
        {FAQS.map((f) => (
          <div key={f.q} className="helpFaq__item">
            <dt className="helpFaq__q">{f.q}</dt>
            <dd className="helpFaq__a">{f.a}</dd>
          </div>
        ))}
      </dl>

      <div className="panel">
        <h2 className="simple__heading">Own a salon?</h2>
        <p className="panel__text">
          List your salon on {BRAND.name} and choose whether you offer at-salon service, home
          service, or both. Our team reviews each submission before it goes live.
        </p>
        <p className="panel__text panel__text--fine">
          Owner and admin dashboards are in build.
        </p>
        <Link to="/salons" className="btn btn--ghost-gold">
          Browse salons meanwhile
        </Link>
      </div>
    </div>
  )
}
