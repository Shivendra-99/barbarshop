import { Link } from 'react-router-dom'
import { useApp } from '../store/AppStore'
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

  return (
    <div className="shell shell--narrow simple">
      <h1 className="display simple__title">Wallet</h1>
      <p className="lede simple__lede">
        Refunds credited here are instant and apply to your next booking.
      </p>

      <div className="walletCard">
        <div className="walletCard__label">Available balance</div>
        <div className="walletCard__amount money">{formatINR(walletBalance)}</div>
        <Link to="/salons" className="btn btn--gold walletCard__cta">
          Book with wallet
        </Link>
      </div>

      <h2 className="simple__heading">Transactions</h2>

      {myLedger.length === 0 ? (
        <div className="empty">
          <h3 className="empty__title">No transactions yet</h3>
          <p className="empty__text">
            When you cancel a paid booking and choose wallet, the refund lands here instantly.
          </p>
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
