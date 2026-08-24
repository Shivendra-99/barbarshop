import { Link } from 'react-router-dom'
import { BRAND, FAQS } from '../data/seed'
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
