import { useNavigate } from 'react-router-dom'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div
      style={{
        minHeight: 'calc(100vh - var(--header-h))',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '80px var(--gutter)',
        gap: 20,
      }}
    >
      <div className="eyebrow eyebrow--tight">Error 404</div>
      <h1 className="display" style={{ fontSize: 'clamp(32px, 5vw, 46px)' }}>
        That chair isn&rsquo;t here
      </h1>
      <p style={{ color: 'var(--muted-3)', margin: 0, fontWeight: 300, fontSize: 17 }}>
        The page you were looking for has been moved or never existed.
      </p>
      <button type="button" className="btn btn--gold" onClick={() => navigate('/')}>
        Back to home
      </button>
    </div>
  )
}
