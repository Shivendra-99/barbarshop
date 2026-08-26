import './ServiceRows.css'

const BLANK = { name: '', amount: '', mins: '', desc: '' }

/**
 * Controlled editor for a list of service rows (name / price / duration / desc).
 * Used when an owner defines a salon's initial menu. Values are strings so the
 * inputs stay controlled; the parent parses numbers on submit.
 */
export default function ServiceRows({ rows, onChange }) {
  const update = (i, key, value) => {
    onChange(rows.map((r, k) => (k === i ? { ...r, [key]: value } : r)))
  }
  const remove = (i) => onChange(rows.filter((_, k) => k !== i))
  const add = () => onChange([...rows, { ...BLANK }])

  return (
    <div className="svcRows">
      <div className="svcRows__head" aria-hidden="true">
        <span>Service</span>
        <span>Price ₹</span>
        <span>Mins</span>
        <span />
      </div>

      {rows.map((row, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <div className="svcRows__row" key={i}>
          <div className="svcRows__main">
            <input
              className="field__input svcRows__name"
              value={row.name}
              onChange={(e) => update(i, 'name', e.target.value)}
              placeholder="Haircut & Styling"
              aria-label={`Service ${i + 1} name`}
            />
            <input
              className="field__input svcRows__desc"
              value={row.desc}
              onChange={(e) => update(i, 'desc', e.target.value)}
              placeholder="Short description (optional)"
              aria-label={`Service ${i + 1} description`}
            />
          </div>
          <input
            className="field__input svcRows__num"
            value={row.amount}
            onChange={(e) => update(i, 'amount', e.target.value.replace(/\D/g, ''))}
            inputMode="numeric"
            placeholder="250"
            aria-label={`Service ${i + 1} price`}
          />
          <input
            className="field__input svcRows__num"
            value={row.mins}
            onChange={(e) => update(i, 'mins', e.target.value.replace(/\D/g, ''))}
            inputMode="numeric"
            placeholder="30"
            aria-label={`Service ${i + 1} duration in minutes`}
          />
          <button
            type="button"
            className="svcRows__remove"
            onClick={() => remove(i)}
            disabled={rows.length === 1}
            aria-label={`Remove service ${i + 1}`}
          >
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      ))}

      <button type="button" className="btn btn--outline btn--sm svcRows__add" onClick={add}>
        + Add service
      </button>
    </div>
  )
}
