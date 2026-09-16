import { useEffect, useRef, useState } from 'react'
import { SUPPORT } from '../data/seed'
import { useT } from '../lib/i18n'
import './SupportChat.css'

/**
 * A self-contained help "chat box" for the Help & Support page. It needs no
 * backend: the customer taps a common question and gets an instant answer from
 * the same FAQ content used across the app, then can escalate to the real team
 * on WhatsApp, phone or email. Keeps a small in-memory transcript for the feel
 * of a chat without storing anything.
 */

// The five common questions mirror the app-wide FAQ dictionary keys.
const QUESTIONS = [1, 2, 3, 4, 5]

export default function SupportChat() {
  const t = useT()
  const [log, setLog] = useState([]) // { from: 'bot' | 'user', text }
  const [asked, setAsked] = useState([])
  const bodyRef = useRef(null)

  // Auto-scroll to the newest message.
  useEffect(() => {
    const el = bodyRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [log])

  const ask = (n) => {
    setAsked((a) => (a.includes(n) ? a : [...a, n]))
    setLog((l) => [
      ...l,
      { from: 'user', text: t(`faq.${n}.q`) },
      { from: 'bot', text: t(`faq.${n}.a`) },
    ])
  }

  const reset = () => {
    setLog([])
    setAsked([])
  }

  const remaining = QUESTIONS.filter((n) => !asked.includes(n))

  return (
    <div className="schat" aria-label={t('chat.title')}>
      <div className="schat__head">
        <span className="schat__avatar" aria-hidden="true">
          S
        </span>
        <div>
          <div className="schat__title">{t('chat.title')}</div>
          <div className="schat__sub">{t('chat.subtitle')}</div>
        </div>
        <span className="schat__status" aria-hidden="true" />
      </div>

      <div className="schat__body" ref={bodyRef}>
        <div className="schat__msg schat__msg--bot">{t('chat.greeting')}</div>

        {log.map((m, i) => (
          <div
            key={i}
            className={`schat__msg schat__msg--${m.from === 'bot' ? 'bot' : 'user'}`}
          >
            {m.text}
          </div>
        ))}
      </div>

      <div className="schat__quick">
        {remaining.map((n) => (
          <button key={n} type="button" className="schat__chip" onClick={() => ask(n)}>
            {t(`faq.${n}.q`)}
          </button>
        ))}
        {log.length > 0 && remaining.length === 0 && (
          <button type="button" className="schat__chip schat__chip--muted" onClick={reset}>
            {t('chat.back')}
          </button>
        )}
      </div>

      <div className="schat__foot">
        <div className="schat__footText">{t('chat.escalate')}</div>
        <div className="schat__actions">
          <a
            className="schat__act schat__act--wa"
            href={SUPPORT.whatsappUrl('Hi SalonSaathi, I need help with ')}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('chat.whatsapp')}
          </a>
          <a className="schat__act" href={`tel:${SUPPORT.phoneTel}`}>
            {t('chat.call')}
          </a>
          <a className="schat__act" href={`mailto:${SUPPORT.email}`}>
            {t('chat.email')}
          </a>
        </div>
      </div>
    </div>
  )
}
