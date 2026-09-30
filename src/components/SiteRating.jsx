import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useT } from '../lib/i18n'
import { useToast } from './Toast'
import RatingDialog from './RatingDialog'

/**
 * "How was SalonSaathi?" — rates the website/app itself (not a salon). Loads the
 * user's earlier rating so re-opening edits it. `onDone(review)` after saving.
 */
export default function SiteRatingDialog({ onClose, onDone }) {
  const t = useT()
  const { push } = useToast()
  const [initial, setInitial] = useState(undefined) // undefined = loading

  useEffect(() => {
    api
      .mySiteReview()
      .then((r) => setInitial(r.review ? { rating: r.review.rating, review: r.review.comment } : null))
      .catch(() => setInitial(null))
  }, [])

  if (initial === undefined) return null
  return (
    <RatingDialog
      title={t('site.rateTitle')}
      subtitle={t('site.rateSub')}
      placeholder={t('site.placeholder')}
      initial={initial}
      onClose={onClose}
      onSubmit={async ({ rating, review }) => {
        try {
          const r = await api.rateSite({ rating, comment: review })
          push({ tone: 'success', title: t('site.thanks'), body: `${rating}★` })
          onDone?.(r.review)
          onClose()
        } catch (err) {
          push({ tone: 'warn', title: 'Could not submit rating', body: err.message })
        }
      }}
    />
  )
}

const PROMPTED = 'salonsathi:v1:siteRatePrompted'

/** Ask for a website rating once per browser, and never if already rated. */
export async function shouldPromptSiteRating() {
  try {
    if (localStorage.getItem(PROMPTED)) return false
    localStorage.setItem(PROMPTED, '1')
  } catch {
    return false // no storage: don't risk nagging on every visit
  }
  try {
    return !(await api.mySiteReview()).review
  } catch {
    return false
  }
}
