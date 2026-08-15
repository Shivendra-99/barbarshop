import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ScrollToTop from './components/ScrollToTop'
import Home from './pages/Home'
import Explore from './pages/Explore'
import Shop from './pages/Shop'
import Booking from './pages/Booking'
import Verify from './pages/Verify'
import Confirmed from './pages/Confirmed'
import Appointments from './pages/Appointments'
import Dashboard from './pages/Dashboard'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/shop/:shopId" element={<Shop />} />
          <Route path="/booking" element={<Booking />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/confirmed" element={<Confirmed />} />
          <Route path="/appointments" element={<Appointments />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  )
}
