import { useState } from 'react'
import { DASH_NAV, EARNINGS, KPIS, REQUESTS, SCHEDULE, WEEK_TOTAL } from '../data/content'
import { formatLongDate } from '../lib/datetime'
import { formatINR } from '../lib/money'
import './Dashboard.css'

export default function Dashboard() {
  const [section, setSection] = useState('Today')

  return (
    <div className="dash">
      {/* ---------------- Sidebar ---------------- */}
      <aside className="dash__side">
        <div className="dash__shop">The Gilded Chair</div>
        <nav className="dash__nav">
          {DASH_NAV.map((d) => (
            <button
              key={d}
              type="button"
              className={`dash__navItem${section === d ? ' is-active' : ''}`}
              aria-current={section === d ? 'page' : undefined}
              onClick={() => setSection(d)}
            >
              {d}
            </button>
          ))}
        </nav>
        <div className="dash__tip">Chair utilisation is up 12% this week.</div>
      </aside>

      {/* ---------------- Main ---------------- */}
      <div className="dash__main">
        <div className="dash__head">
          <div>
            <h1 className="display dash__title">{formatLongDate()}</h1>
            <div className="dash__sub">
              9 appointments · 2 pending requests · {formatINR(15300)} booked
            </div>
          </div>
          <div className="dash__headActions">
            <button type="button" className="btn btn--outline dash__headBtn">
              Block time
            </button>
            <button type="button" className="btn btn--gold dash__headBtn">
              Add booking
            </button>
          </div>
        </div>

        <div className="kpis">
          {KPIS.map((k) => (
            <div key={k.label} className="card kpi">
              <div className="kpi__label">{k.label}</div>
              <div className="kpi__value">{k.value}</div>
              <div className={k.positive ? 'kpi__delta is-positive' : 'kpi__delta'}>
                {k.delta}
              </div>
            </div>
          ))}
        </div>

        <div className="dash__grid">
          <div className="card panel">
            <h2 className="panel__title">Today&rsquo;s chair</h2>
            {SCHEDULE.map((s) => (
              <div key={s.time} className="slotRow">
                <div className="slotRow__time">{s.time}</div>
                <div className={`slotRow__bar slotRow__bar--${s.tone}`} />
                <div className="slotRow__body">
                  <div className="slotRow__client">{s.client}</div>
                  <div className="slotRow__svc">
                    {s.service} · {s.dur}
                  </div>
                </div>
                <div className={`slotRow__status slotRow__status--${s.tone}`}>{s.status}</div>
                <div className="slotRow__price">{s.price}</div>
              </div>
            ))}
          </div>

          <div className="dash__col">
            <div className="card panel">
              <h2 className="panel__title">Earnings this week</h2>
              <div className="bars">
                {EARNINGS.map((e) => (
                  <div key={e.day} className="bars__col">
                    <div
                      className={e.peak ? 'bars__bar is-peak' : 'bars__bar'}
                      style={{ height: e.h }}
                    />
                    <div className="bars__day">{e.day}</div>
                  </div>
                ))}
              </div>
              <div className="bars__total">
                <span>Week total</span>
                <span className="bars__totalVal">{formatINR(WEEK_TOTAL)}</span>
              </div>
            </div>

            <div className="card panel panel--gold">
              <h2 className="panel__title">Pending requests</h2>
              {REQUESTS.map((r) => (
                <div key={r.client} className="req">
                  <div className="req__client">{r.client}</div>
                  <div className="req__detail">{r.detail}</div>
                  <div className="req__actions">
                    <button type="button" className="btn btn--gold req__btn">
                      Accept
                    </button>
                    <button type="button" className="btn btn--outline req__btn req__btn--muted">
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
