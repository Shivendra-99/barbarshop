/**
 * Versioned localStorage persistence.
 *
 * Bumping STORE_VERSION discards older shapes rather than trying to migrate
 * them — this is seeded demo data, so a clean reseed is always preferable to a
 * half-migrated store.
 */

const PREFIX = 'salonsathi'
export const STORE_VERSION = 1

const key = (name) => `${PREFIX}:v${STORE_VERSION}:${name}`

const available = (() => {
  try {
    const probe = `${PREFIX}:probe`
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return true
  } catch {
    // Private browsing, disabled storage, or SSR — fall back to memory.
    return false
  }
})()

const memory = new Map()

export function load(name, fallback) {
  try {
    const raw = available ? window.localStorage.getItem(key(name)) : memory.get(key(name))
    if (raw == null) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function save(name, value) {
  try {
    const raw = JSON.stringify(value)
    if (available) window.localStorage.setItem(key(name), raw)
    else memory.set(key(name), raw)
  } catch {
    // Quota exceeded or circular value — losing demo persistence is survivable.
  }
}

export function clear(name) {
  try {
    if (available) window.localStorage.removeItem(key(name))
    else memory.delete(key(name))
  } catch {
    /* no-op */
  }
}

/** Wipes every SalonSathi key, including older versions. */
export function clearAll() {
  try {
    if (!available) {
      memory.clear()
      return
    }
    Object.keys(window.localStorage)
      .filter((k) => k.startsWith(`${PREFIX}:`))
      .forEach((k) => window.localStorage.removeItem(k))
  } catch {
    /* no-op */
  }
}
