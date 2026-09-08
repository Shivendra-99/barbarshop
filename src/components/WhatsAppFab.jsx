import { SUPPORT } from '../data/seed'
import './WhatsAppFab.css'

/** Floating "Chat with us on WhatsApp" button, fixed bottom-right on every page. */
export default function WhatsAppFab() {
  return (
    <a
      className="wafab"
      href={SUPPORT.whatsappUrl('Hi SalonSaathi, I need help with ')}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
    >
      <span className="wafab__label">Chat with us on WhatsApp</span>
      <span className="wafab__btn">
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <path
            fill="currentColor"
            d="M16 3C9.4 3 4 8.4 4 15c0 2.1.6 4.2 1.6 6L4 27l6.2-1.6c1.7.9 3.7 1.4 5.8 1.4 6.6 0 12-5.4 12-12S22.6 3 16 3Zm0 21.8c-1.9 0-3.7-.5-5.3-1.5l-.4-.2-3.7 1 1-3.6-.2-.4A9.7 9.7 0 0 1 6.2 15C6.2 9.6 10.6 5.2 16 5.2S25.8 9.6 25.8 15 21.4 24.8 16 24.8Zm5.6-7.3c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.2-.7.2s-.8 1-1 1.2c-.2.2-.4.2-.7.1-.3-.2-1.3-.5-2.5-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.3.4-.6.1-.2 0-.4 0-.6l-1-2.3c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.5.3-.7.3-1.4.2-1.5-.1-.2-.3-.3-.6-.4Z"
          />
        </svg>
      </span>
    </a>
  )
}
