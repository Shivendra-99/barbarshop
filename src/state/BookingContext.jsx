import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  BARBERS,
  BOOKING_FEE,
  CITIES,
  SERVICES,
  SERVICE_FILTERS,
  SHOPS,
  WHEN_OPTIONS,
} from '../data/content'
import { nextOpenDay, toISO } from '../lib/datetime'

const BookingContext = createContext(null)

const OTP_LENGTH = 6
const RESEND_SECONDS = 31
const EMPTY_OTP = Array(OTP_LENGTH).fill('')

export function BookingProvider({ children }) {
  /* ---- Search criteria (driven by the hero controls) ---- */
  const [cityId, setCityId] = useState(CITIES[0].id)
  const [serviceFilter, setServiceFilter] = useState(SERVICE_FILTERS[0])
  const [when, setWhen] = useState(WHEN_OPTIONS[1])

  /* ---- Booking selection ---- */
  const [shopId, setShopId] = useState(SHOPS[0].id)
  const [serviceName, setServiceName] = useState(SERVICES[0].name)
  const [barberName, setBarberName] = useState(BARBERS[0].name)
  const [date, setDate] = useState(() => toISO(nextOpenDay(3)))
  const [slot, setSlot] = useState('10:30')
  const [otp, setOtp] = useState(EMPTY_OTP)
  const [resendIn, setResendIn] = useState(RESEND_SECONDS)
  const [reference, setReference] = useState(null)

  const city = useMemo(() => CITIES.find((c) => c.id === cityId) ?? CITIES[0], [cityId])

  /** Shops matching the current city and service filter. */
  const matchingShops = useMemo(() => {
    const inCity = SHOPS.filter((s) => s.city === cityId)
    if (serviceFilter === SERVICE_FILTERS[0]) return inCity
    return inCity.filter((s) => s.kinds.includes(serviceFilter))
  }, [cityId, serviceFilter])

  const shop = useMemo(() => SHOPS.find((s) => s.id === shopId) ?? SHOPS[0], [shopId])
  const service = useMemo(
    () => SERVICES.find((s) => s.name === serviceName) ?? SERVICES[0],
    [serviceName],
  )

  const total = service.amount + BOOKING_FEE
  const otpComplete = otp.every((d) => d !== '')

  /** Keep the selected shop inside the chosen city. */
  const selectCity = useCallback((id) => {
    setCityId(id)
    const first = SHOPS.find((s) => s.city === id)
    if (first) setShopId(first.id)
  }, [])

  const tickResend = useCallback(() => {
    setResendIn((n) => (n > 0 ? n - 1 : 0))
  }, [])

  const setOtpDigit = useCallback((index, value) => {
    const digit = (value || '').replace(/\D/g, '').slice(-1)
    setOtp((prev) => {
      const next = prev.slice()
      next[index] = digit
      return next
    })
  }, [])

  const startVerification = useCallback(() => {
    setOtp(EMPTY_OTP)
    setResendIn(RESEND_SECONDS)
    setReference(null)
  }, [])

  const resendCode = useCallback(() => {
    setOtp(EMPTY_OTP)
    setResendIn(RESEND_SECONDS)
  }, [])

  const confirmBooking = useCallback(() => {
    // Demo reference; a real backend would return this from the booking call.
    const ref = `BN-${String(Math.floor(10000 + Math.random() * 89999))}`
    setReference(ref)
    return ref
  }, [])

  const value = useMemo(
    () => ({
      // search
      city,
      cityId,
      selectCity,
      serviceFilter,
      setServiceFilter,
      when,
      setWhen,
      matchingShops,
      // booking
      shop,
      shopId,
      selectShop: setShopId,
      service,
      selectService: setServiceName,
      barber: barberName,
      selectBarber: setBarberName,
      date,
      selectDate: setDate,
      slot,
      selectSlot: setSlot,
      otp,
      otpComplete,
      setOtpDigit,
      resendIn,
      tickResend,
      resendCode,
      startVerification,
      confirmBooking,
      reference,
      fee: BOOKING_FEE,
      total,
    }),
    [
      city, cityId, selectCity, serviceFilter, when, matchingShops,
      shop, shopId, service, barberName, date, slot, otp, otpComplete,
      setOtpDigit, resendIn, tickResend, resendCode, startVerification,
      confirmBooking, reference, total,
    ],
  )

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>
}

export function useBooking() {
  const ctx = useContext(BookingContext)
  if (!ctx) throw new Error('useBooking must be used inside a <BookingProvider>')
  return ctx
}

/** Drives the verification resend countdown while the screen is mounted. */
export function useResendCountdown() {
  const { resendIn, tickResend } = useBooking()
  useEffect(() => {
    if (resendIn <= 0) return undefined
    const id = setInterval(tickResend, 1000)
    return () => clearInterval(id)
  }, [resendIn, tickResend])
  return resendIn
}
