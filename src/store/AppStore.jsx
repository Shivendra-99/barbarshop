import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, getToken, setToken, clearToken } from '../lib/api'
import { enrichSalon, OWNERS, FOUNDER } from '../data/seed'

const AppContext = createContext(null)

/** Sessions last 30 days (enforced by the JWT the server issues). */
export const SESSION_DAYS = 30

const enrichList = (salons = []) => salons.map((s, i) => enrichSalon(s, i))

/** Reads the `exp` claim from the current JWT → epoch ms, for display only. */
function tokenExpiry() {
  const token = getToken()
  if (!token) return Date.now() + SESSION_DAYS * 86400000
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp ? payload.exp * 1000 : Date.now() + SESSION_DAYS * 86400000
  } catch {
    return Date.now() + SESSION_DAYS * 86400000
  }
}

/** The session object pages consume: the API user plus a display expiry. */
const toSession = (user) => ({ ...user, userId: user.id, expiresAt: tokenExpiry() })

export function AppProvider({ children }) {
  const [ready, setReady] = useState(false)
  const [salonsReady, setSalonsReady] = useState(false)
  const [session, setSession] = useState(null)

  // Data slices, each populated from the API by role.
  const [publicSalons, setPublicSalons] = useState([])
  const [myBookings, setMyBookings] = useState([])
  const [walletBalance, setWalletBalance] = useState(0)
  const [myLedger, setMyLedger] = useState([])
  const [mySalons, setMySalons] = useState([])
  const [ownerBookings, setOwnerBookings] = useState([])
  const [allSalons, setAllSalons] = useState([])
  const [allBookings, setAllBookings] = useState([])
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [settings, setSettings] = useState({ comingSoonEnabled: false, comingSoonMessage: '' })

  const role = session?.role ?? null

  /* ---- Loaders ---- */

  const loadPublicSalons = useCallback(async () => {
    try {
      const { salons } = await api.publicSalons()
      setPublicSalons(enrichList(salons))
    } finally {
      setSalonsReady(true)
    }
  }, [])

  const loadSettings = useCallback(async () => {
    try {
      const { settings: s } = await api.settings()
      setSettings(s)
    } catch {
      /* keep defaults */
    }
  }, [])

  const loadNotifications = useCallback(async () => {
    const { notifications: items, unread } = await api.notifications()
    setNotifications(items)
    setUnreadCount(unread)
  }, [])

  const loadCustomer = useCallback(async () => {
    const [{ bookings }, wallet] = await Promise.all([api.myBookings(), api.wallet()])
    setMyBookings(bookings)
    setWalletBalance(wallet.balance)
    setMyLedger(wallet.ledger)
  }, [])

  const loadOwner = useCallback(async () => {
    const [{ salons }, { bookings }] = await Promise.all([api.mySalons(), api.ownerBookings()])
    setMySalons(enrichList(salons))
    setOwnerBookings(bookings)
  }, [])

  const loadFounder = useCallback(async () => {
    const [{ salons }, { bookings }] = await Promise.all([api.allSalons(), api.allBookings()])
    setAllSalons(enrichList(salons))
    setAllBookings(bookings)
  }, [])

  const loadForRole = useCallback(
    async (r) => {
      if (r === 'customer') await loadCustomer()
      else if (r === 'owner') await loadOwner()
      else if (r === 'founder') await loadFounder()
      if (r) await loadNotifications()
    },
    [loadCustomer, loadOwner, loadFounder, loadNotifications],
  )

  /* ---- Bootstrap: restore session + storefront data ---- */

  useEffect(() => {
    let alive = true
    ;(async () => {
      // Storefront salons + settings load for everyone, signed in or not.
      loadPublicSalons().catch(() => {})
      loadSettings().catch(() => {})

      if (getToken()) {
        try {
          const { user } = await api.me()
          if (!alive) return
          setSession(toSession(user))
          setWalletBalance(user.walletBalance ?? 0)
          await loadForRole(user.role)
        } catch {
          clearToken() // token invalid/expired
        }
      }
      if (alive) setReady(true)
    })()
    return () => {
      alive = false
    }
  }, [loadPublicSalons, loadSettings, loadForRole])

  /* ---- Auth actions ---- */

  const requestOtp = useCallback((phone) => api.requestOtp(phone), [])

  const verifyOtp = useCallback(
    async (phone, code, name) => {
      const { token, user, isNew } = await api.verifyOtp(phone, code, name)
      setToken(token)
      setSession(toSession(user))
      setWalletBalance(user.walletBalance ?? 0)
      await loadForRole(user.role)
      return { user, isNew }
    },
    [loadForRole],
  )

  /** MSG91 widget flow: exchange the widget access-token for our session. */
  const widgetLogin = useCallback(
    async (accessToken, phone, name) => {
      const { token, user, isNew } = await api.widgetLogin(accessToken, phone, name)
      setToken(token)
      setSession(toSession(user))
      setWalletBalance(user.walletBalance ?? 0)
      await loadForRole(user.role)
      return { user, isNew }
    },
    [loadForRole],
  )

  const logout = useCallback(() => {
    clearToken()
    setSession(null)
    setMyBookings([])
    setWalletBalance(0)
    setMyLedger([])
    setMySalons([])
    setOwnerBookings([])
    setAllSalons([])
    setAllBookings([])
    setNotifications([])
    setUnreadCount(0)
  }, [])

  /** Persists the display name to the backend, then updates the session. */
  const setName = useCallback(async (name) => {
    const { user } = await api.updateName(name)
    setSession((s) => (s ? { ...s, name: user.name } : s))
    return user
  }, [])

  /* ---- Booking actions ---- */

  const createBooking = useCallback(
    async (draft) => {
      const { booking } = await api.createBooking(draft)
      setMyBookings((prev) => [booking, ...prev])
      loadNotifications().catch(() => {})
      return booking
    },
    [loadNotifications],
  )

  const cancelBooking = useCallback(
    async (booking, method) => {
      const { booking: updated, walletBalance: bal } = await api.cancelBooking(booking.id, method)
      setMyBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
      setWalletBalance(bal)
      api.wallet().then((w) => setMyLedger(w.ledger)).catch(() => {})
      loadNotifications().catch(() => {})
      return updated.refund
    },
    [loadNotifications],
  )

  const rescheduleBooking = useCallback(
    async (booking, { date, dateLabel, slot }) => {
      const { booking: updated } = await api.rescheduleBooking(booking.id, { date, dateLabel, slot })
      setMyBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
      loadNotifications().catch(() => {})
      return updated
    },
    [loadNotifications],
  )

  const rateBooking = useCallback(async (booking, { rating, review }) => {
    const { booking: updated } = await api.rateBooking(booking.id, { rating, review })
    setMyBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
    return updated
  }, [])

  const completeBooking = useCallback(
    async (booking) => {
      const { booking: updated } = await api.completeBooking(booking.id)
      setOwnerBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
      loadNotifications().catch(() => {})
      return updated
    },
    [loadNotifications],
  )

  /* ---- Salon actions ---- */

  const submitSalon = useCallback(
    async (draft) => {
      const { salon } = await api.submitSalon(draft)
      // Refresh the caller's own view: founder-added salons are live immediately.
      if (role === 'founder') await Promise.all([loadFounder(), loadPublicSalons()])
      else await loadOwner()
      loadNotifications().catch(() => {})
      return salon
    },
    [role, loadOwner, loadFounder, loadPublicSalons, loadNotifications],
  )

  const setSalonStatus = useCallback(
    async (salon, status) => {
      await api.setSalonStatus(salon.id, status)
      await Promise.all([loadFounder(), loadPublicSalons()])
      loadNotifications().catch(() => {})
    },
    [loadFounder, loadPublicSalons, loadNotifications],
  )

  const updateSalon = useCallback(
    async (salon, changes) => {
      const { salon: updated } = await api.updateSalon(salon.id, changes)
      await Promise.all([loadFounder(), loadPublicSalons()])
      return updated
    },
    [loadFounder, loadPublicSalons],
  )

  const updateSettings = useCallback(async (changes) => {
    const { settings: s } = await api.updateSettings(changes)
    setSettings(s)
    return s
  }, [])

  const markRead = useCallback(async () => {
    setUnreadCount(0)
    try {
      await api.readNotifications()
      await loadNotifications()
    } catch {
      /* ignore */
    }
  }, [loadNotifications])

  /* ---- Derived ---- */

  const pendingSalons = useMemo(
    () => allSalons.filter((s) => s.status === 'pending'),
    [allSalons],
  )

  const platformStats = useMemo(() => {
    const live = allBookings.filter((b) => b.status !== 'cancelled')
    const earnings = live
      .filter((b) => b.paymentMode === 'online')
      .reduce((sum, b) => sum + b.total, 0)
    return {
      totalBookings: allBookings.length,
      liveBookings: live.length,
      earnings,
      activeSalons: allSalons.filter((s) => s.status === 'approved').length,
      pendingCount: allSalons.filter((s) => s.status === 'pending').length,
    }
  }, [allBookings, allSalons])

  const findSalon = useCallback(
    (id) =>
      publicSalons.find((s) => s.id === id) ||
      mySalons.find((s) => s.id === id) ||
      allSalons.find((s) => s.id === id) ||
      null,
    [publicSalons, mySalons, allSalons],
  )

  const value = useMemo(
    () => ({
      ready,
      salonsReady,
      session,
      userId: session?.userId ?? session?.id ?? null,
      isSignedIn: Boolean(session),
      role,
      isOwner: role === 'owner',
      isFounder: role === 'founder',

      // auth
      requestOtp,
      verifyOtp,
      widgetLogin,
      logout,
      setName,

      // salons
      salons: allSalons,
      publicSalons,
      findSalon,
      mySalons,
      pendingSalons,

      // bookings
      bookings: allBookings,
      myBookings,
      ownerBookings,
      isFirstBooking: role === 'customer' && myBookings.length === 0,
      createBooking,
      cancelBooking,
      rescheduleBooking,
      completeBooking,
      rateBooking,

      // salon mutations
      submitSalon,
      setSalonStatus,
      updateSalon,

      // platform settings
      settings,
      updateSettings,

      // wallet + notifications
      walletBalance,
      myLedger,
      myNotifications: notifications,
      unreadCount,
      markRead,

      // platform
      platformStats,
      owners: OWNERS,
      founder: FOUNDER,
    }),
    [
      ready, salonsReady, session, role, requestOtp, verifyOtp, widgetLogin, logout, setName, allSalons, publicSalons,
      findSalon, mySalons, pendingSalons, allBookings, myBookings, ownerBookings, createBooking,
      cancelBooking, rescheduleBooking, completeBooking, rateBooking, submitSalon, setSalonStatus, updateSalon, settings, updateSettings, walletBalance, myLedger, notifications,
      unreadCount, markRead, platformStats,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>')
  return ctx
}
