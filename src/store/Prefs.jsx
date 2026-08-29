import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react'
import { CITIES, cityById, cityFromPincode } from '../data/seed'
import { api } from '../lib/api'
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
  // The selected city is a full object now (so it can be any Indian city from a
  // PIN lookup, not just the seeded three). Falls back to the legacy stored id.
  const [city, setCityObj] = useState(() => {
    const saved = load('prefs:cityObj', null)
    if (saved?.id) return saved
    return cityById(load('prefs:city', CITIES[0].id))
  })
  // Cities the user has added via PIN, kept for the picker's list.
  const [recentCities, setRecentCities] = useState(() => load('prefs:recentCities', []))
  const [category, setCategory] = useState(() => load('prefs:category', null))
  const [theme, setTheme] = useState(() => load('prefs:theme', 'system'))

  useEffect(() => save('prefs:cityObj', city), [city])
  useEffect(() => save('prefs:recentCities', recentCities), [recentCities])
  useEffect(() => save('prefs:category', category), [category])

  // Seeded cities first, then any the user added via PIN.
  const cities = useMemo(() => {
    const extra = recentCities.filter((r) => !CITIES.some((c) => c.id === r.id))
    return [...CITIES, ...extra]
  }, [recentCities])

  const setCity = useCallback(
    (idOrObj) => {
      save('prefs:located', true) // an explicit pick means don't auto-prompt again
      if (typeof idOrObj !== 'string') return setCityObj(idOrObj)
      const found = [...CITIES, ...recentCities].find((c) => c.id === idOrObj)
      return setCityObj(found ?? cityById(idOrObj))
    },
    [recentCities],
  )

  /** Resolve an India Post lookup into the current city (and remember it). */
  const setCityFromPincode = useCallback((result) => {
    save('prefs:located', true)
    const c = cityFromPincode(result)
    setCityObj(c)
    setRecentCities((list) => {
      if (CITIES.some((k) => k.id === c.id) || list.some((x) => x.id === c.id)) return list
      return [c, ...list].slice(0, 6)
    })
    return c
  }, [])

  const [detecting, setDetecting] = useState(false)

  /** Ask the browser for location → reverse-geocode → set the city. */
  const detectLocation = useCallback(async () => {
    if (!navigator.geolocation) throw new Error('Location not supported on this device.')
    setDetecting(true)
    try {
      const pos = await new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000, maximumAge: 600000 }),
      )
      const { latitude, longitude } = pos.coords
      const r = await api.reverseGeocode(latitude, longitude)
      return setCityFromPincode({ district: r.city || r.district, state: r.state, pincode: r.pincode })
    } finally {
      setDetecting(false)
    }
  }, [setCityFromPincode])

  // First visit (no location chosen yet): try to auto-detect the city.
  useEffect(() => {
    if (load('prefs:located', false)) return
    detectLocation().catch(() => {}) // denied/unavailable → keep the default
  }, [detectLocation])

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
      cityId: city.id,
      city,
      cities,
      setCity,
      setCityFromPincode,
      detectLocation,
      detecting,
      category,
      setCategory,
      theme,
      setTheme,
      resolvedTheme,
    }),
    [city, cities, setCity, setCityFromPincode, detectLocation, detecting, category, theme, resolvedTheme],
  )

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>
}

export function usePrefs() {
  const ctx = useContext(PrefsContext)
  if (!ctx) throw new Error('usePrefs must be used inside a <PrefsProvider>')
  return ctx
}
