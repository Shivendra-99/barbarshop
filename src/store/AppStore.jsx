import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react'
import { SALONS, OWNERS, FOUNDER, salonById, findService } from '../data/seed'
import { quote, refundFor, REFUND_METHODS } from '../lib/pricing'
import { load, save, clearAll } from '../lib/storage'

const AppContext = createContext(null)

/** OTP sessions are remembered for 30 days, per spec. */
export const SESSION_DAYS = 30
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000

const uid = (prefix) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`

/* ------------------------------------------------------------------
   Initial state
   ------------------------------------------------------------------ */

function seedState() {
  return {
    session: null,
    users: {},
    salons: SALONS.map((s) => ({ id: s.id, status: s.status })),
    bookings: [],
    wallet: {},
    ledger: [],
    notifications: [],
  }
}

/** Drops an expired session so a stale 30-day login can't resurrect. */
function hydrate() {
  const persisted = load('state', null)
  if (!persisted) return seedState()

  const base = { ...seedState(), ...persisted }
  if (base.session && base.session.expiresAt <= Date.now()) {
    base.session = null
  }
  return base
}

/* ------------------------------------------------------------------
   Notifications — one booking event fans out to three inboxes
   ------------------------------------------------------------------ */

function notify(state, entries) {
  const stamped = entries.map((e) => ({
    id: uid('ntf'),
    ts: Date.now(),
    read: false,
    ...e,
  }))
  return [...stamped, ...state.notifications].slice(0, 100)
}

/* ------------------------------------------------------------------
   Reducer
   ------------------------------------------------------------------ */

function reducer(state, action) {
  switch (action.type) {
    case 'login': {
      const { phone, name, role } = action
      const existing = state.users[phone]
      const user = existing ?? {
        id: uid('usr'),
        phone,
        name: name || 'Guest',
        role: role || 'customer',
        createdAt: Date.now(),
      }
      return {
        ...state,
        users: { ...state.users, [phone]: user },
        session: {
          userId: user.id,
          phone,
          role: user.role,
          name: user.name,
          expiresAt: Date.now() + SESSION_MS,
        },
      }
    }

    case 'logout':
      return { ...state, session: null }

    case 'updateName': {
      const { phone } = state.session ?? {}
      if (!phone) return state
      const user = { ...state.users[phone], name: action.name }
      return {
        ...state,
        users: { ...state.users, [phone]: user },
        session: { ...state.session, name: action.name },
      }
    }

    case 'createBooking': {
      const b = action.booking
      const salon = salonById(b.salonId)
      return {
        ...state,
        bookings: [b, ...state.bookings],
        notifications: notify(state, [
          {
            audience: `user:${b.userId}`,
            tone: 'success',
            title: 'Booking confirmed',
            body: `${b.serviceName} at ${salon?.name ?? 'salon'} · ${b.dateLabel}, ${b.slot}`,
          },
          {
            audience: `owner:${salon?.ownerId ?? 'unknown'}`,
            tone: 'info',
            title: 'New booking received',
            body: `${b.serviceName} · ${b.dateLabel}, ${b.slot} · ${b.modeLabel}`,
          },
          {
            audience: 'founder',
            tone: 'info',
            title: 'New booking on platform',
            body: `${salon?.name ?? 'Salon'} · ${b.paymentMode === 'online' ? 'Paid online' : 'Cash at salon'}`,
          },
        ]),
      }
    }

    case 'cancelBooking': {
      const { bookingId, refund } = action
      const booking = state.bookings.find((x) => x.id === bookingId)
      if (!booking || booking.status === 'cancelled') return state

      const salon = salonById(booking.salonId)
      const cancelled = { ...booking, status: 'cancelled', refund, cancelledAt: Date.now() }

      // Wallet refunds land immediately; UPI is marked processing and settles offline.
      const creditsWallet = refund.status === 'completed' && refund.amount > 0
      const balance = state.wallet[booking.userId] ?? 0

      return {
        ...state,
        bookings: state.bookings.map((x) => (x.id === bookingId ? cancelled : x)),
        wallet: creditsWallet
          ? { ...state.wallet, [booking.userId]: balance + refund.amount }
          : state.wallet,
        ledger: creditsWallet
          ? [
              {
                id: uid('led'),
                userId: booking.userId,
                type: 'credit',
                amount: refund.amount,
                note: `Refund · ${booking.serviceName}`,
                ts: Date.now(),
              },
              ...state.ledger,
            ]
          : state.ledger,
        notifications: notify(state, [
          {
            audience: `user:${booking.userId}`,
            tone: refund.amount > 0 ? 'success' : 'info',
            title: 'Booking cancelled',
            body:
              refund.amount > 0
                ? `₹${refund.amount} refund · ${REFUND_METHODS[refund.method]?.eta ?? ''}`
                : 'Nothing to refund — this was a pay-at-salon booking.',
          },
          {
            audience: `owner:${salon?.ownerId ?? 'unknown'}`,
            tone: 'warn',
            title: 'Booking cancelled',
            body: `${booking.serviceName} · ${booking.dateLabel}, ${booking.slot}`,
          },
          {
            audience: 'founder',
            tone: 'warn',
            title: 'Cancellation',
            body: `${salon?.name ?? 'Salon'} · ${refund.amount > 0 ? `₹${refund.amount} refunded` : 'no refund due'}`,
          },
        ]),
      }
    }

    case 'setSalonStatus': {
      return {
        ...state,
        salons: state.salons.map((s) =>
          s.id === action.salonId ? { ...s, status: action.status } : s,
        ),
      }
    }

    case 'readNotifications':
      return {
        ...state,
        notifications: state.notifications.map((n) =>
          action.audiences.includes(n.audience) ? { ...n, read: true } : n,
        ),
      }

    case 'reset':
      return seedState()

    default:
      return state
  }
}

/* ------------------------------------------------------------------
   Provider
   ------------------------------------------------------------------ */

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, hydrate)

  useEffect(() => {
    save('state', state)
  }, [state])

  const session = state.session
  const userId = session?.userId ?? null

  /** Salons merged with their live approval status; only approved are public. */
  const salons = useMemo(() => {
    const statuses = Object.fromEntries(state.salons.map((s) => [s.id, s.status]))
    return SALONS.map((s) => ({ ...s, status: statuses[s.id] ?? s.status }))
  }, [state.salons])

  const publicSalons = useMemo(() => salons.filter((s) => s.status === 'approved'), [salons])

  const myBookings = useMemo(
    () => (userId ? state.bookings.filter((b) => b.userId === userId) : []),
    [state.bookings, userId],
  )

  /**
   * The 10% offer is once per customer, counted at booking time. A cancelled
   * first booking does not hand the discount back — otherwise it could be
   * farmed by booking and cancelling repeatedly.
   */
  const isFirstBooking = myBookings.length === 0

  const walletBalance = userId ? (state.wallet[userId] ?? 0) : 0
  const myLedger = useMemo(
    () => (userId ? state.ledger.filter((l) => l.userId === userId) : []),
    [state.ledger, userId],
  )

  const audiences = useMemo(() => {
    if (!session) return []
    if (session.role === 'founder') return ['founder']
    if (session.role === 'owner') return [`owner:${session.userId}`]
    return [`user:${session.userId}`]
  }, [session])

  const myNotifications = useMemo(
    () => state.notifications.filter((n) => audiences.includes(n.audience)),
    [state.notifications, audiences],
  )

  const unreadCount = myNotifications.filter((n) => !n.read).length

  /* ---- Actions ---- */

  const login = useCallback((phone, opts = {}) => {
    dispatch({ type: 'login', phone, ...opts })
  }, [])

  const logout = useCallback(() => dispatch({ type: 'logout' }), [])

  const setName = useCallback((name) => dispatch({ type: 'updateName', name }), [])

  const createBooking = useCallback(
    (draft) => {
      const salon = salonById(draft.salonId)
      const service = findService(draft.serviceId)
      const homeServiceFee = draft.mode === 'home' ? (salon?.homeServiceFee ?? 0) : 0

      const priced = quote({
        amount: service?.amount ?? 0,
        paymentMode: draft.paymentMode,
        isFirstBooking,
        homeServiceFee,
      })

      const booking = {
        id: uid('bkg'),
        ref: `SS${Math.floor(100000 + Math.random() * 899999)}`,
        userId,
        salonId: draft.salonId,
        salonName: salon?.name ?? '',
        serviceId: draft.serviceId,
        serviceName: service?.name ?? '',
        staffId: draft.staffId ?? null,
        staffName: draft.staffName ?? null,
        mode: draft.mode,
        modeLabel: draft.mode === 'home' ? 'Home service' : 'At salon',
        address: draft.address ?? null,
        date: draft.date,
        dateLabel: draft.dateLabel,
        slot: draft.slot,
        paymentMode: draft.paymentMode,
        homeServiceFee,
        ...priced,
        status: 'confirmed',
        createdAt: Date.now(),
      }

      dispatch({ type: 'createBooking', booking })
      return booking
    },
    [userId, isFirstBooking],
  )

  const cancelBooking = useCallback((booking, method) => {
    const refund = refundFor(booking, method)
    dispatch({ type: 'cancelBooking', bookingId: booking.id, refund })
    return refund
  }, [])

  const setSalonStatus = useCallback(
    (salonId, status) => dispatch({ type: 'setSalonStatus', salonId, status }),
    [],
  )

  const markRead = useCallback(() => {
    if (audiences.length) dispatch({ type: 'readNotifications', audiences })
  }, [audiences])

  const resetDemo = useCallback(() => {
    clearAll()
    dispatch({ type: 'reset' })
  }, [])

  const value = useMemo(
    () => ({
      session,
      userId,
      isSignedIn: Boolean(session),
      role: session?.role ?? null,
      login,
      logout,
      setName,
      salons,
      publicSalons,
      bookings: state.bookings,
      myBookings,
      isFirstBooking,
      createBooking,
      cancelBooking,
      walletBalance,
      myLedger,
      myNotifications,
      unreadCount,
      markRead,
      setSalonStatus,
      owners: OWNERS,
      founder: FOUNDER,
      resetDemo,
    }),
    [
      session, userId, login, logout, setName, salons, publicSalons, state.bookings,
      myBookings, isFirstBooking, createBooking, cancelBooking, walletBalance,
      myLedger, myNotifications, unreadCount, markRead, setSalonStatus, resetDemo,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>')
  return ctx
}
