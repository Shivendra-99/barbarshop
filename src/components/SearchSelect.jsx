import { useEffect, useRef, useState } from 'react'
import './SearchSelect.css'

/**
 * Accessible listbox select used by the hero search bar.
 *
 * Native <select> can't carry the two-line label/value treatment the design
 * calls for, so this implements the listbox pattern properly: roving highlight,
 * type-ahead-free keyboard nav (Arrows/Home/End/Enter/Escape), outside-click
 * dismissal, and focus returned to the trigger on close.
 */
export default function SearchSelect({ label, value, options, onChange, getLabel = (o) => o }) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const rootRef = useRef(null)
  const listRef = useRef(null)
  const triggerRef = useRef(null)

  const currentIndex = options.findIndex((o) => getLabel(o) === value)

  const close = (refocus = true) => {
    setOpen(false)
    if (refocus) triggerRef.current?.focus()
  }

  const choose = (option) => {
    onChange(option)
    close()
  }

  const openList = () => {
    setActive(currentIndex >= 0 ? currentIndex : 0)
    setOpen(true)
  }

  // Dismiss on outside pointer press, without stealing focus back.
  useEffect(() => {
    if (!open) return undefined
    const onPointer = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [open])

  // Move DOM focus onto the highlighted option so screen readers track it.
  useEffect(() => {
    if (!open) return
    const el = listRef.current?.querySelector(`[data-idx="${active}"]`)
    el?.focus()
  }, [open, active])

  const onTriggerKeyDown = (e) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
      e.preventDefault()
      openList()
    }
  }

  const onListKeyDown = (e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActive((i) => (i + 1) % options.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setActive((i) => (i - 1 + options.length) % options.length)
        break
      case 'Home':
        e.preventDefault()
        setActive(0)
        break
      case 'End':
        e.preventDefault()
        setActive(options.length - 1)
        break
      case 'Escape':
        e.preventDefault()
        close()
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        choose(options[active])
        break
      case 'Tab':
        setOpen(false)
        break
      default:
        break
    }
  }

  return (
    <div className="sel" ref={rootRef}>
      <button
        type="button"
        ref={triggerRef}
        className={`sel__trigger${open ? ' is-open' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}: ${value}`}
        onClick={() => (open ? close(false) : openList())}
        onKeyDown={onTriggerKeyDown}
      >
        <span className="sel__label" aria-hidden="true">
          {label}
        </span>
        <span className="sel__value" aria-hidden="true">
          {value}
        </span>
        <svg className="sel__caret" viewBox="0 0 12 8" aria-hidden="true" focusable="false">
          <path d="M1 1.5 6 6.5 11 1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>

      {open && (
        <ul
          className="sel__list"
          role="listbox"
          ref={listRef}
          aria-label={label}
          onKeyDown={onListKeyDown}
        >
          {options.map((option, i) => {
            const optLabel = getLabel(option)
            const selected = optLabel === value
            return (
              <li key={optLabel} role="none">
                <button
                  type="button"
                  role="option"
                  data-idx={i}
                  aria-selected={selected}
                  aria-label={optLabel}
                  tabIndex={-1}
                  className={`sel__option${selected ? ' is-selected' : ''}`}
                  onClick={() => choose(option)}
                  onMouseEnter={() => setActive(i)}
                >
                  <span>{optLabel}</span>
                  {option.areas && <span className="sel__hint">{option.areas}</span>}
                  {selected && (
                    <svg className="sel__tick" viewBox="0 0 14 14" aria-hidden="true">
                      <path
                        d="M2 7.5 5.5 11 12 3.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      />
                    </svg>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
