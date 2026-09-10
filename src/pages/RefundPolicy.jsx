import './Simple.css'

export default function RefundPolicy() {
  return (
    <div className="shell shell--narrow simple legal">
      <h1 className="display simple__title">Cancellation &amp; Refund Policy</h1>
      <p className="legal__p">At SalonSaathi, we aim for customer satisfaction.</p>

      <h2 className="simple__heading">A. For Salon Owner — Listing Fee</h2>
      <p className="legal__p">
        Currently, listing your salon on SalonSaathi is FREE. In future, when we introduce a paid
        listing fee, if a salon owner wants to remove their salon after paying, 50% of the listing
        fee will be refunded. The remaining 50% will be charged as a processing and verification fee.
      </p>

      <h2 className="simple__heading">B. For Customer — Salon Booking</h2>
      <ol className="legal__list">
        <li>If a customer cancels a salon booking, they will have two refund options.</li>
        <li>
          <strong>Option 1:</strong> Instant credit in SalonSaathi Wallet — which can be used for
          the next booking.
        </li>
        <li>
          <strong>Option 2:</strong> Refund to original payment method (UPI / Bank Account). UPI
          refunds are instant and bank refunds take 2–3 working days.
        </li>
        <li>Cash bookings have nothing to refund.</li>
      </ol>

      <p className="legal__p">
        For any refund related query, contact us at{' '}
        <a href="tel:+917081126830">+91-7081126830</a> or{' '}
        <a href="mailto:supportsalonsaathi@gmail.com">supportsalonsaathi@gmail.com</a>.
      </p>
    </div>
  )
}
