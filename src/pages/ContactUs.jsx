import { SUPPORT } from '../data/seed'
import './Simple.css'

export default function ContactUs() {
  return (
    <div className="shell shell--narrow simple legal">
      <h1 className="display simple__title">Contact Us</h1>
      <p className="legal__p">
        If you have any questions, queries or need support, feel free to reach us.
      </p>

      <div className="panel">
        <ul className="contact__list">
          <li>
            <span className="contact__k">Company Name</span>
            <span className="contact__v">SalonSaathi</span>
          </li>
          <li>
            <span className="contact__k">Website</span>
            <span className="contact__v">
              <a href="https://www.salonsaathi.in">www.salonsaathi.in</a>
            </span>
          </li>
          <li>
            <span className="contact__k">Address</span>
            <span className="contact__v">Golf City, Lucknow, Uttar Pradesh - 226030</span>
          </li>
          <li>
            <span className="contact__k">Support Mobile</span>
            <span className="contact__v">
              <a href="tel:+917081126830">+91-7081126830</a>
            </span>
          </li>
          <li>
            <span className="contact__k">Support Email</span>
            <span className="contact__v">
              <a href="mailto:supportsalonsaathi@gmail.com">supportsalonsaathi@gmail.com</a>
            </span>
          </li>
          <li>
            <span className="contact__k">Working Hours</span>
            <span className="contact__v">Monday to Saturday, 10:00 AM to 7:00 PM</span>
          </li>
        </ul>
      </div>

      <p className="legal__p">We will try to respond within 24 hours.</p>

      <a
        className="btn wa-btn"
        href={SUPPORT.whatsappUrl('Hi SalonSaathi, I need help with ')}
        target="_blank"
        rel="noopener noreferrer"
        style={{ marginTop: 8 }}
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
  )
}
