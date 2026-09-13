import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { BRAND } from '../data/seed'
import './SalonQrDialog.css'

/**
 * A printable QR code for a salon. Encodes the salon's public booking page so a
 * customer can scan the sticker at the shop and land straight on it. Rendered
 * to a PNG data URL (also used for download). Fixed to the production site URL
 * so a code generated on localhost still works in the real world.
 */
export default function SalonQrDialog({ salon, onClose }) {
  const url = `${BRAND.siteUrl}/salon/${salon.id}`
  const [dataUrl, setDataUrl] = useState('')
  const [err, setErr] = useState('')
  const closeRef = useRef(null)

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    QRCode.toDataURL(url, { width: 640, margin: 2, errorCorrectionLevel: 'M' })
      .then(setDataUrl)
      .catch(() => setErr('Could not generate the QR code.'))
  }, [url])

  const fileName = `salonsaathi-${salon.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-qr.png`

  return (
    <div className="qrm" role="presentation" onMouseDown={onClose}>
      <div
        className="qrm__box anim-pop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button type="button" className="qrm__close" onClick={onClose} aria-label="Close" ref={closeRef}>
          ×
        </button>

        <div className="qrm__brand">{BRAND.name}</div>
        <h2 className="qrm__title" id="qr-title">
          {salon.name}
        </h2>
        <p className="qrm__sub">Scan to book · Point your camera here</p>

        <div className="qrm__code">
          {err ? (
            <p className="qrm__err">{err}</p>
          ) : dataUrl ? (
            <img src={dataUrl} alt={`QR code linking to ${salon.name} booking page`} />
          ) : (
            <div className="qrm__loading" aria-hidden="true" />
          )}
        </div>

        <div className="qrm__url">{url}</div>

        <div className="qrm__actions">
          {dataUrl && (
            <a className="btn btn--gold" href={dataUrl} download={fileName}>
              Download PNG
            </a>
          )}
          <button type="button" className="btn btn--outline" onClick={onClose}>
            Close
          </button>
        </div>
        <p className="qrm__tip">Print it and place it at your reception or mirror stations.</p>
      </div>
    </div>
  )
}
