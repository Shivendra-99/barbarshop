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

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
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
      </Routes>
    </>
  )
}
