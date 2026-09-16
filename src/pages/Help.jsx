import { BRAND, FAQS, SUPPORT } from '../data/seed'
import { COMMISSION_RATE, FIRST_BOOKING_DISCOUNT_RATE } from '../lib/pricing'
import { useT } from '../lib/i18n'
import SupportChat from '../components/SupportChat'
import './Simple.css'

export default function Help() {
  const t = useT()

  const howItPays = [
    {
      title: t('help.payOnline'),
      body: t('help.payOnlineBody', {
        brand: BRAND.name,
        pct: FIRST_BOOKING_DISCOUNT_RATE * 100,
      }),
    },
    {
      title: t('help.payAtSalon'),
      body: t('help.payAtSalonBody'),
    },
    {
      title: t('help.commission'),
      body:
        COMMISSION_RATE === 0
          ? t('help.commissionFree')
          : t('help.commissionRate', { pct: (1 - COMMISSION_RATE) * 100 }),
    },
  ]

  return (
    <div className="shell shell--narrow simple">
      <h1 className="display simple__title">{t('help.title')}</h1>
      <p className="lede simple__lede">{t('help.lede', { brand: BRAND.name })}</p>

      <h2 className="simple__heading">{t('help.howPayment')}</h2>
      <div className="payGrid">
        {howItPays.map((p) => (
          <div key={p.title} className="card payGrid__item">
            <h3 className="payGrid__title">{p.title}</h3>
            <p className="payGrid__body">{p.body}</p>
          </div>
        ))}
      </div>

      <h2 className="simple__heading">{t('help.needHelp')}</h2>
      <SupportChat />

      <div className="panel wa-panel" style={{ marginTop: 20 }}>
        <div>
          <p className="panel__text">{t('help.waText')}</p>
          <p className="panel__text panel__text--fine">{SUPPORT.whatsappDisplay}</p>
        </div>
        <a
          className="btn wa-btn"
          href={SUPPORT.whatsappUrl('Hi SalonSaathi, I need help with ')}
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18">
            <path
              fill="currentColor"
              d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.9 5-1.3A10 10 0 1 0 12 2Zm5.8 14.2c-.2.7-1.4 1.3-2 1.4-.5.1-1.2.1-1.9-.1-.4-.1-1-.3-1.7-.6-3-1.3-4.9-4.3-5.1-4.5-.1-.2-1.2-1.6-1.2-3 0-1.4.7-2.1 1-2.4.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.4.5-.3.3c-.2.2-.3.4-.2.6.2.4.8 1.3 1.6 2 1 .9 1.9 1.2 2.2 1.3.2.1.4.1.6-.1l.7-.9c.2-.2.4-.2.6-.1l1.9.9c.3.1.4.2.5.3.1.2.1.8-.1 1.5Z"
            />
          </svg>
          {t('help.waBtn')}
        </a>
      </div>

      <h2 className="simple__heading">{t('help.commonQuestions')}</h2>
      <dl className="helpFaq">
        {FAQS.map((f, i) => (
          <div key={f.q} className="helpFaq__item">
            <dt className="helpFaq__q">{t(`faq.${i + 1}.q`)}</dt>
            <dd className="helpFaq__a">{t(`faq.${i + 1}.a`)}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
