import { useState } from 'react'
import './LogoMark.css'

/**
 * SalonSaathi logo. Uses the brand image at /logo.png (public/) when present —
 * drop your logo there. Falls back to a gold scissors SVG mark if the image is
 * missing, so the logo is never broken.
 */
export default function LogoMark({ className = '', title = 'SalonSaathi' }) {
  const [imgOk, setImgOk] = useState(true)

  if (imgOk) {
    return (
      <img
        src="/logo.png"
        alt={title}
        className={`logoImg ${className}`}
        onError={() => setImgOk(false)}
      />
    )
  }

  return (
    <svg className={className} viewBox="0 0 32 32" role="img" aria-label={title} fill="none">
      <g stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8.5" cy="23" r="3.7" />
        <circle cx="23.5" cy="23" r="3.7" />
        <path d="M11.4 20.4 26 5.5" />
        <path d="M20.6 20.4 6 5.5" />
      </g>
      <circle cx="16" cy="15" r="1.7" fill="currentColor" />
    </svg>
  )
}
