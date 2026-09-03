import { useEffect, useRef, useState } from 'react'

/** Star-rating dialog. Reuses the .modal styles from Appointments.css. */
export default function RatingDialog({ booking, onClose, onSubmit }) {
  const [rating, setRating] = useState(booking.rating || 0)
  const [hover, setHover] = useState(0)
  const [review, setReview] = useState(booking.review || '')
  const [busy, setBusy] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    ref.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const submit = async () => {
    if (!rating || busy) return
    setBusy(true)
    try {
      await onSubmit({ rating, review: review.trim() })
    } finally {
      setBusy(false)
    }
  }

  const shown = hover || rating

  return (
    <div className="modal" role="presentation" onMouseDown={onClose}>
      <div
        className="modal__box anim-pop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rate-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 className="modal__title" id="rate-title" tabIndex={-1} ref={ref}>
          Rate {booking.salonName}
        </h2>
        <p className="modal__text">
          {booking.serviceName} · {booking.dateLabel}
        </p>

        <div className="stars" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className={`star${shown >= n ? ' is-on' : ''}`}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(n)}
              aria-label={`${n} star${n > 1 ? 's' : ''}`}
              aria-pressed={rating === n}
            >
              ★
            </button>
          ))}
        </div>

        <textarea
          className="field__input"
          rows={3}
          value={review}
          onChange={(e) => setReview(e.target.value)}
          placeholder="Add a note about your experience (optional)"
          maxLength={500}
        />

        <div className="modal__actions" style={{ marginTop: 20 }}>
          <button type="button" className="btn btn--outline" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn--gold" onClick={submit} disabled={!rating || busy}>
            {busy ? 'Saving…' : 'Submit rating'}
          </button>
        </div>
      </div>
    </div>
  )
}
