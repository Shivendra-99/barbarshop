import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppStore'
import { BRAND } from '../data/seed'
import { load, save } from '../lib/storage'
import { IMG_UNISEX } from '../assets'
import './IntroGate.css'

/**
 * First-visit welcome gate: offers Log in or Skip (browse as guest). Shown only
 * when nobody is signed in and the visitor hasn't already chosen. The choice is
 * remembered so it never blocks a returning visitor.
 */
export default function IntroGate() {
  const { session, ready } = useApp()
  const navigate = useNavigate()
  const [dismissed, setDismissed] = useState(() => load('intro:skipped', false))

  if (!ready || session || dismissed) return null

  const skip = () => {
    save('intro:skipped', true)
    setDismissed(true)
  }
  const login = () => {
    save('intro:skipped', true)
    navigate('/login')
  }

  return (
    <div className="intro" role="dialog" aria-modal="true" aria-label={`Welcome to ${BRAND.name}`}>
      <div className="intro__card anim-pop">
        <div className="intro__art" aria-hidden="true">
          <img src={IMG_UNISEX} alt="" />
          <div className="intro__scrim" />
        </div>
        <div className="intro__body">
          <div className="eyebrow">Welcome to</div>
          <h1 className="intro__brand">{BRAND.name}</h1>
          <p className="intro__tag">{BRAND.tagline}</p>
          <div className="intro__actions">
            <button type="button" className="btn btn--gold btn--block" onClick={login}>
              Log in / Sign up
            </button>
            <button type="button" className="btn btn--outline btn--block" onClick={skip}>
              Skip — browse as guest
            </button>
          </div>
          <p className="intro__fine">You can log in anytime to book an appointment.</p>
        </div>
      </div>
    </div>
  )
}
