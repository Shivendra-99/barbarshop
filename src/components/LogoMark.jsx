/**
 * SalonSaathi brand mark — stylised salon scissors. Uses currentColor so it
 * picks up the surrounding text colour (gold in the header/panel, etc.), and
 * stays crisp at any size (header, footer, favicon).
 */
export default function LogoMark({ className, title = 'SalonSaathi' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      role="img"
      aria-label={title}
      fill="none"
    >
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
