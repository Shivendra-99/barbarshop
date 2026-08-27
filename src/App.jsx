import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ScrollToTop from './components/ScrollToTop'
import Protected from './components/Protected'
import Home from './pages/Home'
import Salons from './pages/Salons'
import Salon from './pages/Salon'
import Book from './pages/Book'
import Confirmed from './pages/Confirmed'
import Appointments from './pages/Appointments'
import Wallet from './pages/Wallet'
import Account from './pages/Account'
import Help from './pages/Help'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import PanelLayout from './panel/PanelLayout'
import FounderDashboard from './panel/FounderDashboard'
import FounderSalons from './panel/FounderSalons'
import FounderOwners from './panel/FounderOwners'
import FounderBookings from './panel/FounderBookings'
import OwnerDashboard from './panel/OwnerDashboard'
import OwnerAddSalon from './panel/OwnerAddSalon'
import OwnerServices from './panel/OwnerServices'
import OwnerBookings from './panel/OwnerBookings'

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* ---------------- Customer app ---------------- */}
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/salons" element={<Salons />} />
          <Route path="/salon/:salonId" element={<Salon />} />
          <Route path="/help" element={<Help />} />
          <Route path="/login" element={<Login />} />

          <Route
            path="/book/:salonId"
            element={
              <Protected>
                <Book />
              </Protected>
            }
          />
          <Route
            path="/confirmed/:bookingId"
            element={
              <Protected>
                <Confirmed />
              </Protected>
            }
          />
          <Route
            path="/appointments"
            element={
              <Protected>
                <Appointments />
              </Protected>
            }
          />
          <Route
            path="/wallet"
            element={
              <Protected>
                <Wallet />
              </Protected>
            }
          />
          <Route
            path="/account"
            element={
              <Protected>
                <Account />
              </Protected>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Route>

        {/* ---------------- Founder admin ---------------- */}
        <Route
          path="/admin"
          element={
            <Protected role="founder">
              <PanelLayout role="founder" />
            </Protected>
          }
        >
          <Route index element={<FounderDashboard />} />
          <Route path="salons" element={<FounderSalons />} />
          <Route path="owners" element={<FounderOwners />} />
          <Route path="bookings" element={<FounderBookings />} />
        </Route>

        {/* ---------------- Owner dashboard ---------------- */}
        <Route
          path="/owner"
          element={
            <Protected role="owner">
              <PanelLayout role="owner" />
            </Protected>
          }
        >
          <Route index element={<OwnerDashboard />} />
          <Route path="add" element={<OwnerAddSalon />} />
          <Route path="services" element={<OwnerServices />} />
          <Route path="bookings" element={<OwnerBookings />} />
        </Route>
      </Routes>
    </>
  )
}
