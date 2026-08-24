import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import './Toast.css'

const ToastContext = createContext(null)

const AUTO_DISMISS_MS = 5000

let seq = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef(new Map())

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const push = useCallback(
    (toast) => {
      seq += 1
      const id = `t${seq}`
      setToasts((list) => [...list, { id, tone: 'info', ...toast }].slice(-3))
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), toast.duration ?? AUTO_DISMISS_MS),
      )
      return id
    },
    [dismiss],
  )

  useEffect(() => {
    const pending = timers.current
    return () => {
      pending.forEach(clearTimeout)
      pending.clear()
    }
  }, [])

  const value = useMemo(() => ({ push, dismiss }), [push, dismiss])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Polite: announced without stealing focus from the flow in progress. */}
      <div className="toaster" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.tone}`}>
            <span className="toast__dot" aria-hidden="true" />
            <div className="toast__body">
              <div className="toast__title">{t.title}</div>
              {t.body && <div className="toast__text">{t.body}</div>}
              {t.meta && <div className="toast__meta">{t.meta}</div>}
            </div>
            <button
              type="button"
              className="toast__close"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
