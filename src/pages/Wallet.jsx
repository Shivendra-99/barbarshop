import { Link } from 'react-router-dom'
import { useApp } from '../store/AppStore'
import { useT } from '../lib/i18n'
import { formatINR } from '../lib/money'
import './Simple.css'

const formatWhen = (ts) =>
  new Date(ts).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

export default function Wallet() {
  const { walletBalance, myLedger } = useApp()
  const t = useT()

  return (
    <div className="shell shell--narrow simple">
      <h1 className="display simple__title">{t('wallet.title')}</h1>
      <p className="lede simple__lede">{t('wallet.lede')}</p>

      <div className="walletCard">
        <div className="walletCard__label">{t('wallet.available')}</div>
        <div className="walletCard__amount money">{formatINR(walletBalance)}</div>
        <Link to="/salons" className="btn btn--gold walletCard__cta">
          {t('wallet.bookWith')}
        </Link>
      </div>

      <h2 className="simple__heading">{t('wallet.transactions')}</h2>

      {myLedger.length === 0 ? (
        <div className="empty">
          <h3 className="empty__title">{t('wallet.none')}</h3>
          <p className="empty__text">{t('wallet.noneText')}</p>
        </div>
      ) : (
        <ul className="ledger">
          {myLedger.map((entry) => (
            <li key={entry.id} className="ledger__row">
              <span className={`ledger__icon ledger__icon--${entry.type}`} aria-hidden="true">
                {entry.type === 'credit' ? '↓' : '↑'}
              </span>
              <span className="ledger__body">
                <span className="ledger__note">{entry.note}</span>
                <span className="ledger__when">{formatWhen(entry.ts)}</span>
              </span>
              <span className={`ledger__amount money ledger__amount--${entry.type}`}>
                {entry.type === 'credit' ? '+' : '−'}
                {formatINR(entry.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
