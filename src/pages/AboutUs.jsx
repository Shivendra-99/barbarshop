import { Link } from 'react-router-dom'
import './Simple.css'
import { useSeo } from '../lib/seo'

export default function AboutUs() {
  useSeo({ title: 'About Us', description: 'SalonSaathi helps you discover and book trusted salons and beauty parlours near you — at the salon or at home.', path: '/about-us' })
  return (
    <div className="shell shell--narrow simple legal">
      <h1 className="display simple__title">About Us</h1>
      <p className="legal__meta">Last Updated: 24 September 2026</p>

      <p className="legal__p">
        SalonSaathi is a platform to discover and book the best salons near you in Lucknow and across
        India. We connect customers with top-rated salons for at-salon and home services.
      </p>
      <p className="legal__p">
        Our mission is to make salon booking easy, transparent and affordable. For salon owners, we
        provide a platform to list their business, get more customers and grow online.
      </p>
      <p className="legal__p">SalonSaathi is operated from Jakhamai, Post Tiwaripur, Kunda, Pratapgarh, Uttar Pradesh - 230202.</p>

      <h2 className="simple__heading">How SalonSaathi Works</h2>

      <h3 className="legal__subheading">1. OTP Verification System</h3>
      <p className="legal__p">
        Every booking comes with a unique Booking ID and a 4-digit OTP. The OTP is shared with the
        customer via SMS, WhatsApp, and in My Bookings. The salon owner must verify the OTP to mark
        the service as Completed and to receive the payment in their wallet.
      </p>

      <h3 className="legal__subheading">2. Late Arrival Policy</h3>
      <p className="legal__p">
        If a customer arrives up to 15 minutes late, the service will be provided subject to seat
        availability. If unavailable, the booking will be marked as a No-Show.
      </p>

      <h3 className="legal__subheading">3. Rating &amp; Review</h3>
      <p className="legal__p">
        Customers can rate and review the salon and services after the service is completed.
      </p>

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
