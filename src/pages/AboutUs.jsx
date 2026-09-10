import { Link } from 'react-router-dom'
import './Simple.css'

export default function AboutUs() {
  return (
    <div className="shell shell--narrow simple legal">
      <h1 className="display simple__title">About Us</h1>

      <p className="legal__p">
        SalonSaathi is a platform to discover and book the best salons near you in Lucknow and across
        India. We connect customers with top-rated salons for at-salon and home services.
      </p>
      <p className="legal__p">
        Our mission is to make salon booking easy, transparent and affordable. For salon owners, we
        provide a platform to list their business, get more customers and grow online.
      </p>
      <p className="legal__p">SalonSaathi is operated from Golf City, Lucknow, UP - 226030.</p>

      <div className="panel">
        <h2 className="simple__heading" style={{ marginTop: 0 }}>Own a salon?</h2>
        <p className="panel__text">List your salon today on SalonSaathi and reach more customers.</p>
        <Link to="/owner/add" className="btn btn--gold">
          List your salon
        </Link>
      </div>
    </div>
  )
}
