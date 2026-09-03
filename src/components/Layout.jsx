import { Outlet } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import IntroGate from './IntroGate'
import { usePrefs } from '../store/Prefs'

export default function Layout() {
  const { city, setCity } = usePrefs()

  return (
    <>
      <IntroGate />
      <a className="skip" href="#main">
        Skip to content
      </a>
      <Header city={city} onCityChange={setCity} />
      <main id="main">
        <Outlet />
      </main>
      <Footer />
    </>
  )
}
