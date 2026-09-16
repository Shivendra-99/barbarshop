import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../store/AppStore'
import ServiceEditor from './ServiceEditor'
import './panel-ui.css'
import './OwnerServices.css'

export default function OwnerServices() {
  const { mySalons } = useApp()

  const approved = useMemo(() => mySalons.filter((s) => s.status === 'approved'), [mySalons])
  const [salonId, setSalonId] = useState('')

  useEffect(() => {
    if (!salonId && approved.length) setSalonId(approved[0].id)
  }, [approved, salonId])

  return (
    <>
      <div className="p-head">
        <h2 className="p-head__title">Services</h2>
        <p className="p-head__sub">
          Add, edit or remove the services your salon offers. Changes go live immediately.
        </p>
      </div>

      {approved.length === 0 ? (
        <div className="p-empty">
          <h4 className="p-empty__title">No approved salons yet</h4>
          <p className="p-empty__text">
            You can edit a menu once a salon is approved. New salons set their initial menu on the
            add-salon form.
          </p>
          <Link to="/owner/add" className="btn btn--gold btn--sm" style={{ marginTop: 16 }}>
            + Add salon
          </Link>
        </div>
      ) : (
        <>
          {approved.length > 1 && (
            <label className="field svcMgr__salon" htmlFor="svc-salon">
              <span className="field__label">Salon</span>
              <select
                id="svc-salon"
                className="field__input"
                value={salonId}
                onChange={(e) => setSalonId(e.target.value)}
              >
                {approved.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.area}
                  </option>
                ))}
              </select>
            </label>
          )}

          <ServiceEditor salonId={salonId} />
        </>
      )}
    </>
  )
}
