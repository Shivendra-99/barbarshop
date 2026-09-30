import { useToast } from './Toast'

/** Small "Copy" button: codes, UPI IDs and amounts get pasted, never retyped. */
export default function CopyButton({ value, label, className = 'copybtn', children = 'Copy' }) {
  const { push } = useToast()
  const copy = async () => {
    const text = String(value)
    let ok = false
    try {
      await navigator.clipboard.writeText(text)
      ok = true
    } catch {
      // Clipboard API blocked (some phone browsers / embedded views): fall back
      // to a hidden textarea + execCommand, which works almost everywhere.
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0'
      document.body.appendChild(ta)
      ta.select()
      try {
        ok = document.execCommand('copy')
      } catch {
        ok = false
      }
      ta.remove()
    }
    push(
      ok
        ? { tone: 'success', title: `${label} copied`, body: text }
        : { tone: 'warn', title: 'Could not copy', body: 'Select the text and copy it manually.' },
    )
  }
  return (
    <button type="button" className={className} onClick={copy} aria-label={`Copy ${label}`}>
      {children}
    </button>
  )
}
