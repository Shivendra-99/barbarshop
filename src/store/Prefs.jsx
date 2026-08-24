import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { CITIES, cityById } from '../data/seed'
import { load, save } from '../lib/storage'

const PrefsContext = createContext(null)

/**
 * Search preferences — which city and which salon category the customer is
 * browsing. Kept apart from AppStore because these are view preferences, not
 * domain records, and they persist independently of the session.
 */
export function PrefsProvider({ children }) {
  const [cityId, setCityId] = useState(() => load('prefs:city', CITIES[0].id))
  const [category, setCategory] = useState(() => load('prefs:category', null))

  useEffect(() => save('prefs:city', cityId), [cityId])
  useEffect(() => save('prefs:category', category), [category])

  const value = useMemo(
    () => ({
      cityId,
      city: cityById(cityId),
      setCity: setCityId,
      category,
      setCategory,
    }),
    [cityId, category],
  )

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>
}

export function usePrefs() {
  const ctx = useContext(PrefsContext)
  if (!ctx) throw new Error('usePrefs must be used inside <PrefsProvider>')
  return ctx
}
