import { useState } from 'react'
import { PAST_APPOINTMENTS, UPCOMING_APPOINTMENTS } from '../data/content'
import './Appointments.css'

const TABS = ['Upcoming', 'Past']

export default function Appointments() {
  const [tab, setTab] = useState('Upcoming')
  const rows = tab === 'Upcoming' ? UPCOMING_APPOINTMENTS : PAST_APPOINTMENTS

  return (
    <div className="appts">
      <h1 className="display appts__title">My appointments</h1>

      <div className="tabs appts__tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            className="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="appts__list">
        {rows.map((a) => (
          <div key={`${a.mon}-${a.day}-${a.shop}`} className="appt">
            <div className="appt__date">
              <div className="appt__mon">{a.mon}</div>
              <div className="appt__day">{a.day}</div>
              <div className="appt__time">{a.time}</div>
            </div>

            <img className="appt__img" src={a.img} alt={a.shop} loading="lazy" />

            <div className="appt__body">
              <div className="appt__shop">{a.shop}</div>
              <div className="appt__meta">
                {a.service} with {a.barber}
              </div>
              <div className="appt__addr">{a.address}</div>
            </div>

            <div className="appt__right">
              <span className={`appt__status appt__status--${a.tone}`}>{a.status}</span>
              <div className="appt__price">{a.price}</div>
              <button type="button" className="appt__action">
                {a.action}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
