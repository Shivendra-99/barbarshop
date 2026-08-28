import { useMemo, useState } from 'react'
import { useApp } from '../store/AppStore'
import { useToast } from '../components/Toast'
import { useConfirm } from '../components/Confirm'
import { cityById, categoryById } from '../data/seed'
import { formatINR } from '../lib/money'
import './panel-ui.css'

const FILTERS = ['All', 'Pending', 'Approved', 'Rejected']

const STATUS_BADGE = {
  approved: 'badge--green',
  pending: 'badge--amber',
  rejected: 'badge--red',
}

export default function FounderSalons() {
  const { salons, setSalonStatus } = useApp()
  const { push } = useToast()
  const confirm = useConfirm()
  const [filter, setFilter] = useState('All')

  const rows = useMemo(() => {
    if (filter === 'All') return salons
    return salons.filter((s) => s.status === filter.toLowerCase())
  }, [salons, filter])

  const decide = async (salon, approve) => {
    if (!approve) {
      // Suspending a live salon vs declining a pending one.
      const suspending = salon.status === 'approved'
      const ok = await confirm({
        title: suspending ? 'Suspend this salon?' : 'Reject this salon?',
        message: suspending
          ? `${salon.name} will be removed from the marketplace and stop taking bookings.`
          : `${salon.name} will be declined and won't appear to customers.`,
        confirmLabel: suspending ? 'Suspend' : 'Reject',
        tone: 'danger',
      })
      if (!ok) return
    }
    try {
      await setSalonStatus(salon, approve ? 'approved' : 'rejected')
      push({
        tone: approve ? 'success' : 'warn',
        title: approve ? 'Salon approved' : 'Salon declined',
        body: `${salon.name} · ${salon.area}`,
      })
    } catch (err) {
      push({ tone: 'warn', title: 'Action failed', body: err.message })
    }
  }

  return (
    <>
      <div className="p-head">
        <h2 className="p-head__title">Salons</h2>
        <p className="p-head__sub">Every salon on the platform and its approval status.</p>
      </div>

      <div className="fs-filters">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            className="chip"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="ptable-wrap">
        <table className="ptable">
          <thead>
            <tr>
              <th>Salon</th>
              <th>Type</th>
              <th>City</th>
              <th>Owner</th>
              <th>From</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id}>
                <td>
                  <div className="ptable__strong">{s.name}</div>
                  <div className="ptable__sub">{s.area}</div>
                </td>
                <td>{categoryById(s.category).label}</td>
                <td>{cityById(s.city).label}</td>
                <td>{s.ownerName ?? '—'}</td>
                <td className="ptable__money">{s.from ? formatINR(s.from) : '—'}</td>
                <td>
                  <span className={`badge ${STATUS_BADGE[s.status] ?? 'badge--neutral'}`}>
                    {s.status}
                  </span>
                </td>
                <td>
                  {s.status === 'pending' ? (
                    <div className="fs-actions">
                      <button
                        type="button"
                        className="btn btn--gold btn--sm"
                        onClick={() => decide(s, true)}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="btn btn--danger btn--sm"
                        onClick={() => decide(s, false)}
                      >
                        Reject
                      </button>
                    </div>
                  ) : s.status === 'approved' ? (
                    <button
                      type="button"
                      className="btn btn--danger btn--sm"
                      onClick={() => decide(s, false)}
                    >
                      Suspend
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn--ghost-gold btn--sm"
                      onClick={() => decide(s, true)}
                    >
                      Reinstate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
