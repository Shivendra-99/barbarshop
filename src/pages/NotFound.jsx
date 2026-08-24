import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '52vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '72px var(--gutter)',
        gap: 18,
      }}
    >
      <div className="eyebrow">Error 404</div>
      <h1 className="display" style={{ fontSize: 'clamp(30px, 5vw, 44px)' }}>
        That page isn&rsquo;t here
      </h1>
      <p className="lede" style={{ maxWidth: 420 }}>
        The page you were looking for has moved, or never existed.
      </p>
      <Link to="/" className="btn btn--gold">
        Back to home
      </Link>
    </div>
  )
}
