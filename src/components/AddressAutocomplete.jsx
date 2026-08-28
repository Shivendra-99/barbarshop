import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import './AddressAutocomplete.css'

/**
 * Address input with Mappls-powered suggestions. Behaves as a plain text input
 * when suggestions are unavailable (short query, provider off, or an error), so
 * the field never breaks. `onChange(text)` keeps the parent in control of the
 * value; `onSelect(item)` fires with { name, address, eLoc } on pick.
 */
export default function AddressAutocomplete({
  id,
  value,
  onChange,
  onSelect,
  placeholder,
  ariaInvalid,
  near,
}) {
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [loading, setLoading] = useState(false)
  const boxRef = useRef(null)
  const skipFetch = useRef(false)

  // Debounced lookup as the user types (skip the fetch triggered by a pick).
  useEffect(() => {
    if (skipFetch.current) {
      skipFetch.current = false
      return undefined
    }
    const q = (value ?? '').trim()
    if (q.length < 3) {
      setItems([])
      setOpen(false)
      return undefined
    }
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const { suggestions } = await api.autosuggestAddress(q, near)
        setItems(suggestions)
        setOpen(suggestions.length > 0)
        setActive(-1)
      } catch {
        setItems([])
        setOpen(false)
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [value, near])

  // Close the menu on an outside click.
  useEffect(() => {
    const onDoc = (e) => {
      if (!boxRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const choose = (item) => {
    const full = item.address ? `${item.name}, ${item.address}` : item.name
    skipFetch.current = true
    onChange(full)
    onSelect?.(item)
    setOpen(false)
    setItems([])
  }

  const onKeyDown = (e) => {
    if (!open || items.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault()
      choose(items[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="addr" ref={boxRef}>
      <input
        id={id}
        className="field__input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => items.length > 0 && setOpen(true)}
        placeholder={placeholder}
        aria-invalid={ariaInvalid}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
      />
      {loading && <span className="addr__spin" aria-hidden="true" />}
      {open && (
        <ul className="addr__menu" role="listbox">
          {items.map((it, i) => (
            <li
              // eslint-disable-next-line react/no-array-index-key
              key={it.eLoc || i}
              role="option"
              aria-selected={i === active}
              className={`addr__item${i === active ? ' is-active' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault()
                choose(it)
              }}
              onMouseEnter={() => setActive(i)}
            >
              <span className="addr__name">{it.name}</span>
              {it.address && <span className="addr__sub">{it.address}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
