import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import './Confirm.css'

const ConfirmContext = createContext(null)

/**
 * Promise-based confirmation. `const ok = await confirm({ ... })` resolves true
 * when the user confirms, false on cancel / Escape / backdrop click. One dialog
 * lives at the app root; callers never render it themselves.
 */
export function ConfirmProvider({ children }) {
  const [opts, setOpts] = useState(null) // null when closed
  const resolveRef = useRef(null)
  const confirmBtn = useRef(null)

  const confirm = useCallback(
    (nextOpts) =>
      new Promise((resolve) => {
        resolveRef.current = resolve
        setOpts(nextOpts)
      }),
    [],
  )

  // Resolve outside of any state updater so StrictMode's double-invoke can't
  // swallow or duplicate the result.
  const close = useCallback((result) => {
    setOpts(null)
    const resolve = resolveRef.current
    resolveRef.current = null
    resolve?.(result)
  }, [])

  // Focus the confirm button and wire Escape while open.
  useEffect(() => {
    if (!opts) return undefined
    confirmBtn.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') close(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [opts, close])

  const danger = opts?.tone === 'danger'

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {opts && (
        <div
          className="cfm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cfm-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close(false)
          }}
        >
          <div className="cfm__box anim-pop">
            <h2 className="cfm__title" id="cfm-title">
              {opts.title ?? 'Are you sure?'}
            </h2>
            {opts.message && <p className="cfm__message">{opts.message}</p>}
            <div className="cfm__actions">
              <button type="button" className="btn btn--outline" onClick={() => close(false)}>
                {opts.cancelLabel ?? 'Cancel'}
              </button>
              <button
                type="button"
                ref={confirmBtn}
                className={`btn ${danger ? 'btn--danger cfm__danger' : 'btn--gold'}`}
                onClick={() => close(true)}
              >
                {opts.confirmLabel ?? 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used inside <ConfirmProvider>')
  return ctx
}
