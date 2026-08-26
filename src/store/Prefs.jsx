import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { CITIES, cityById } from '../data/seed'
import { load, save } from '../lib/storage'

const PrefsContext = createContext(null)

export const THEMES = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'system', label: 'System' },
]

/**
 * Search and display preferences. Kept apart from AppStore because these are
 * view preferences, not domain records, and persist independently of the
 * session.
 */
export function PrefsProvider({ children }) {
  const [cityId, setCityId] = useState(() => load('prefs:city', CITIES[0].id))
  const [category, setCategory] = useState(() => load('prefs:category', null))
  const [theme, setTheme] = useState(() => load('prefs:theme', 'system'))

  useEffect(() => save('prefs:city', cityId), [cityId])
  useEffect(() => save('prefs:category', category), [category])

  /**
   * `system` removes the attribute entirely so the prefers-color-scheme query
   * in tokens.css takes over; an explicit choice stamps the root and wins.
   * The same write happens in an inline script in index.html so the first
   * paint is already correct — without it, dark users get a cream flash.
   */
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', theme)
    save('prefs:theme', theme)
  }, [theme])

  // Track the OS setting so the UI can show what `system` currently resolves to.
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false,
  )

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mq) return undefined
    const onChange = (e) => setSystemDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const resolvedTheme = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme

  const value = useMemo(
    () => ({
      cityId,
      city: cityById(cityId),
      setCity: setCityId,
      category,
      setCategory,
      theme,
      setTheme,
      resolvedTheme,
    }),
    [cityId, category, theme, resolvedTheme],
  )

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>
}

export function usePrefs() {
  const ctx = useContext(PrefsContext)
  if (!ctx) throw new Error('usePrefs must be used inside a <PrefsProvider>')
  return ctx
}
