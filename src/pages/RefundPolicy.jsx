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

      <h2 className="simple__heading">C. Salon Owner — Withdrawal Policy</h2>
      <ul className="legal__list">
        <li>
          <strong>Minimum withdrawal:</strong> ₹500.
        </li>
        <li>
          <strong>Instant withdrawal:</strong> available anytime with a 7% charge.
        </li>
        <li>
          <strong>Weekly withdrawal:</strong> free (0% fee) — processed every Sunday by the
          SalonSaathi team.
        </li>
      </ul>

      <h2 className="simple__heading">D. Online Payment — Cancellation, Reschedule &amp; Refund</h2>

      <h3 className="legal__subheading">Reschedule</h3>
      <p className="legal__p">
        Rescheduling is allowed only up to <strong>2 hours before</strong> the booking time.
      </p>

      <h3 className="legal__subheading">Cancelled by customer</h3>
      <ul className="legal__list">
        <li>
          <strong>More than 2 hours before:</strong> full refund to SalonSaathi Wallet (0% fee). For
          an instant Bank/UPI refund, a 2% fee applies.
        </li>
        <li>
          <strong>Within 2 hours of booking time:</strong> 10% cancellation fee (both Wallet and
          instant refund).
        </li>
        <li>
          <strong>After 15 minutes of booking time:</strong> 15% cancellation fee (both Wallet and
          instant refund).
        </li>
        <li>
          <strong>Note:</strong> instant Bank/UPI refund amounts are credited within 5–7 working
          days.
        </li>
      </ul>

      <h2 className="simple__heading">E. No-Show — Cancelled by Salon Owner</h2>
      <ul className="legal__list">
        <li>The salon owner will wait a maximum of 15 minutes.</li>
        <li>
          If the customer does not arrive, the owner can mark the booking as a{' '}
          <strong>Customer No-Show</strong>.
        </li>
        <li>
          On a No-Show, a 15% penalty applies to the customer and 85% is refunded to the SalonSaathi
          Wallet or the original UPI / bank account.
        </li>
      </ul>

      <h2 className="simple__heading">F. Cash / Pay at Salon Bookings</h2>
      <ul className="legal__list">
        <li>There is no refund for Cash (Pay at Salon) bookings, as no payment is collected upfront.</li>
        <li>
          If a customer cancels or is marked No-Show <strong>3 times continuously</strong> on Cash
          bookings, their Cash option will be blocked. They can then book only with Online Payment.
        </li>
      </ul>

      <p className="legal__p">
        For any refund related query, contact us at{' '}
        <a href="tel:+917081126830">+91-7081126830</a> or{' '}
        <a href="mailto:supportsalonsaathi@gmail.com">supportsalonsaathi@gmail.com</a>.
      </p>
    </div>
  )
}
