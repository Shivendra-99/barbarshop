import { useEffect, useState } from 'react'
import './panel-ui.css'

const SITE = 'https://www.salonsaathi.in'

/**
 * Draws a printable card: brand name, the QR code (opens the website), a
 * call-to-action and the address. Returns a PNG data URL.
 */
async function makeQrCard() {
  // Loaded on demand so the QR library isn't in every page's bundle.
  const { default: QRCode } = await import('qrcode')
  await document.fonts?.ready
  const W = 1000
  const H = 1240
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = '#c9a227'
  ctx.lineWidth = 6
  ctx.strokeRect(24, 24, W - 48, H - 48)

  ctx.fillStyle = '#1f1a13'
  ctx.textAlign = 'center'
  ctx.font = '72px Marcellus, Georgia, serif'
  ctx.fillText('SalonSaathi', W / 2, 150)

  // High error correction so the code still scans when printed small or smudged.
  const qr = document.createElement('canvas')
  await QRCode.toCanvas(qr, SITE, {
    width: 720,
    margin: 1,
    errorCorrectionLevel: 'H',
    color: { dark: '#1f1a13', light: '#ffffff' },
  })
  ctx.drawImage(qr, (W - 720) / 2, 210)

  ctx.font = '600 44px Jost, "Segoe UI", sans-serif'
  ctx.fillText('Scan to book your salon', W / 2, 1025)
  ctx.fillStyle = '#7d6013'
  ctx.font = '38px Jost, "Segoe UI", sans-serif'
  ctx.fillText('www.salonsaathi.in', W / 2, 1095)

  return canvas.toDataURL('image/png')
}

/** Founder dashboard: "Website QR" button → QR in a popup, with download. */
export default function WebsiteQr() {
  const [open, setOpen] = useState(false)
  const [png, setPng] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!open || png) return
    makeQrCard()
      .then(setPng)
      .catch(() => setErr('Could not create the QR code. Please try again.'))
  }, [open, png])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <button type="button" className="btn btn--outline btn--sm" onClick={() => setOpen(true)}>
        Website QR
      </button>
      {open && (
        <div className="pmodal" role="presentation" onMouseDown={() => setOpen(false)}>
          <div
            className="pmodal__box pmodal__box--sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="qr-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h3 className="pmodal__title" id="qr-title">
              Website QR code
            </h3>
            <p className="pmodal__text">
              Scanning it opens <strong>www.salonsaathi.in</strong>. Print it for salons, flyers or
              posters.
            </p>
            <div className="qrcard">
              {png ? (
                <img src={png} alt="QR code that opens www.salonsaathi.in" />
              ) : (
                <span className="se-hint">{err || 'Creating QR code…'}</span>
              )}
            </div>
            <div className="pmodal__actions">
              <button type="button" className="btn btn--outline" onClick={() => setOpen(false)}>
                Close
              </button>
              <a
                className={`btn btn--gold${png ? '' : ' is-disabled'}`}
                href={png || undefined}
                download="salonsaathi-website-qr.png"
                aria-disabled={!png}
              >
                Download image
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
