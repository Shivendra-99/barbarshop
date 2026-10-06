import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { formatINR } from '../lib/money'
import { useT } from '../lib/i18n'
import CopyButton from './CopyButton'
import './CouponCodes.css'

/**
 * Live coupon codes with a Copy button each, so customers can paste them at
 * checkout. Platform-wide codes, plus the salon's own when `salonId` is given.
 * Renders nothing when there are no live codes.
 */
export default function CouponCodes({ salonId }) {
  const t = useT()
  const [codes, setCodes] = useState([])

  useEffect(() => {
    let alive = true
    api
      .publicCoupons(salonId)
      .then((r) => alive && setCodes(r.coupons || []))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [salonId])

  if (!codes.length) return null
  return (
    <ul className="cc" aria-label={t('offer.codes')}>
      {codes.slice(0, 4).map((c) => (
        <li key={c.code} className="cc__item">
          <span className="cc__code">{c.code}</span>
          <span className="cc__what">
            {c.type === 'percent'
              ? t('book.couponOffPct', { pct: c.value })
              : t('book.couponOffFlat', { amount: formatINR(c.value) })}
            {c.firstBookingOnly ? (
              ` · ${t('offer.firstOnly')}`
            ) : (
              <>
                {c.type === 'percent' && c.maxDiscount > 0 && ` · ${t('offer.upTo', { amount: formatINR(c.maxDiscount) })}`}
                {c.minOrder > 0 && ` · ${t('offer.min', { amount: formatINR(c.minOrder) })}`}
              </>
            )}
          </span>
          <CopyButton value={c.code} label={c.code} className="cc__copy" />
        </li>
      ))}
    </ul>
  )
}
