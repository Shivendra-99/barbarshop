import './Simple.css'

export default function Terms() {
  return (
    <div className="shell shell--narrow simple legal">
      <h1 className="display simple__title">Terms &amp; Conditions</h1>
      <p className="legal__meta">
        Effective Date: September 6, 2026 · Website:{' '}
        <a href="https://salonsaathi.in">https://salonsaathi.in</a>
      </p>

      <p className="legal__p">
        Welcome to SalonSaathi. By accessing and using our website https://salonsaathi.in, you agree
        to these Terms and Conditions.
      </p>

      <h2 className="simple__heading">1. Acceptance of Terms</h2>
      <p className="legal__p">
        By using our website, you confirm that you have read and agree to these Terms. If you do not
        agree, please do not use our website.
      </p>

      <h2 className="simple__heading">2. Our Service</h2>
      <p className="legal__p">
        SalonSaathi is a platform that connects customers with nearby salons and barbershops for
        booking services like haircut, shaving, facial, etc. We are only a booking platform, we do
        not own or run any salon.
      </p>

      <h2 className="simple__heading">3. User Accounts &amp; Eligibility</h2>
      <ul className="legal__list">
        <li>
          Our service can be used by users of all ages. If you are under 18, you must use the
          service under the supervision of your parent or guardian.
        </li>
        <li>You must provide correct mobile number and name for booking.</li>
        <li>You are responsible for keeping your OTP and account secure.</li>
      </ul>

      <h2 className="simple__heading">4. Bookings and Payments</h2>
      <ul className="legal__list">
        <li>All bookings made through SalonSaathi are subject to confirmation by the salon owner.</li>
        <li>
          Prices shown on the website are set by the respective salon owners and can change at any
          time.
        </li>
        <li>
          Payment can be made online or at the salon (as per salon&rsquo;s option). SalonSaathi is
          not responsible for any payment disputes between customer and salon.
        </li>
      </ul>

      <h2 className="simple__heading">5. Cancellations &amp; Refunds</h2>
      <p className="legal__p">
        Customers can cancel a confirmed booking any time before the scheduled slot from{' '}
        <strong>My Bookings</strong>. For online (prepaid) bookings, a cancellation fee is deducted
        from the refund depending on how close to the appointment you cancel:
      </p>
      <ul className="legal__list">
        <li>
          <strong>2 hours or more before the slot:</strong> full refund, no cancellation fee. (A 2%
          gateway charge applies only if you choose a bank/UPI refund instead of Wallet.)
        </li>
        <li>
          <strong>Within 2 hours of the slot:</strong> 10% cancellation fee; the remaining amount is
          refunded.
        </li>
        <li>
          <strong>After the slot time has passed (late cancellation):</strong> 15% cancellation fee.
        </li>
        <li>
          <strong>No-show</strong> (you do not arrive and the salon marks you absent): 15% fee; the
          remaining 85% is refunded.
        </li>
        <li>
          <strong>If the salon cancels</strong> your booking, you receive a full refund with no fee.
        </li>
        <li>
          <strong>Cash / pay-at-salon bookings:</strong> no money is collected in advance, so there
          is nothing to refund on cancellation.
        </li>
      </ul>
      <p className="legal__p">
        The exact refund amount and any applicable fee are always shown to you before you confirm a
        cancellation. Wallet refunds are credited instantly; bank/UPI refunds are processed within
        5&ndash;7 working days.
      </p>

      <h2 className="simple__heading">6. Responsibilities of Salon Owners</h2>
      <ul className="legal__list">
        <li>Salon owners must provide correct information about their shop, services, and prices.</li>
        <li>They must provide good quality service to customers.</li>
      </ul>

      <h2 className="simple__heading">7. User Conduct</h2>
      <p className="legal__p">You agree not to:</p>
      <ul className="legal__list">
        <li>Provide false information</li>
        <li>Misuse our platform for fraud or spam</li>
        <li>Try to hack or damage our website</li>
      </ul>

      <h2 className="simple__heading">8. Intellectual Property</h2>
      <p className="legal__p">
        All content on https://salonsaathi.in including logo, design, text, and graphics is owned by
        SalonSaathi. You cannot copy it without our permission.
      </p>

      <h2 className="simple__heading">9. Limitation of Liability</h2>
      <p className="legal__p">
        SalonSaathi only provides the booking platform. We are not responsible for the quality of
        service, behavior of salon staff, or any injury or loss at the salon. Any dispute regarding
        service is between the customer and the salon owner.
      </p>

      <h2 className="simple__heading">10. Termination</h2>
      <p className="legal__p">
        We reserve the right to suspend or delete any user or salon account that violates these
        Terms.
      </p>

      <h2 className="simple__heading">11. Changes to Terms</h2>
      <p className="legal__p">
        We may update these Terms from time to time. The updated version will be posted on this page
        at https://salonsaathi.in/terms-and-conditions
      </p>

      <h2 className="simple__heading">12. Governing Law</h2>
      <p className="legal__p">
        These Terms are governed by the laws of India. Any dispute will be subject to the
        jurisdiction of courts in Pratapgarh, Uttar Pradesh.
      </p>

      <h2 className="simple__heading">13. How do refunds work?</h2>
      <p className="legal__p">
        To get a refund, go to <strong>My Bookings</strong> &gt; <strong>Cancel Booking</strong>. Wallet refund is instant. Bank/UPI refund will be credited within 5-7 working days as per cancellation policy.
      </p>

      <h2 className="simple__heading">14. Contact Us</h2>
      <p className="legal__p">
        If you have any questions about this Privacy Policy, please contact us:
        <br />
        <strong>SalonSaathi</strong>
        <br />
        Website: <a href="https://www.salonsaathi.in">https://www.salonsaathi.in</a>
        <br />
        Email: <a href="mailto:supportsalonsaathi@gmail.com">supportsalonsaathi@gmail.com</a>
        <br />
        Phone: +91 7081126830
        <br />
        Address: Jakhamai, Post Tiwaripur, Kunda, Pratapgarh, Uttar Pradesh - 230202
      </p>
    </div>
  )
}
