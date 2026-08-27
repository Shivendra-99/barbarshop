import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useToast } from '../components/Toast'
import { useConfirm } from '../components/Confirm'
import './panel-ui.css'

const phoneValid = (p) => /^[6-9]\d{9}$/.test(p)

const joinedLabel = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

export default function FounderOwners() {
  const { push } = useToast()
  const confirm = useConfirm()

  const [owners, setOwners] = useState([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      const { owners: list } = await api.owners()
      setOwners(list)
    } catch (err) {
      push({ tone: 'warn', title: 'Could not load owners', body: err.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const canSubmit = name.trim().length > 0 && phoneValid(phone) && !saving

  const addOwner = async (e) => {
    e.preventDefault()
    if (!canSubmit) return

    const ok = await confirm({
      title: 'Add this salon owner?',
      message: `${name.trim()} (+91 ${phone}) will be able to sign in with this number and manage their own salons and bookings.`,
      confirmLabel: 'Add owner',
    })
    if (!ok) return

    setSaving(true)
    try {
      const { owner } = await api.addOwner({ name: name.trim(), phone })
      setOwners((list) => [owner, ...list.filter((o) => o.id !== owner.id)])
      setName('')
      setPhone('')
      push({ tone: 'success', title: 'Owner added', body: `${owner.name} · +91 ${owner.phone}` })
    } catch (err) {
      push({ tone: 'warn', title: 'Could not add owner', body: err.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="p-head">
        <h2 className="p-head__title">Owners</h2>
        <p className="p-head__sub">
          Add salon owners by name and number. They sign in with an OTP on that number and land on
          their own dashboard.
        </p>
      </div>

      <div className="pcard" style={{ marginBottom: 28 }}>
        <div className="pcard__body" style={{ padding: 20 }}>
          <form className="fo-form" onSubmit={addOwner} noValidate>
            <label className="field fo-field" htmlFor="owner-name">
              <span className="field__label">Owner name</span>
              <input
                id="owner-name"
                className="field__input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Rakesh Verma"
                autoComplete="name"
                maxLength={60}
              />
            </label>

            <label className="field fo-field" htmlFor="owner-phone">
              <span className="field__label">Mobile number</span>
              <div className="fo-phone">
                <span className="fo-cc">+91</span>
                <input
                  id="owner-phone"
                  className="field__input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="98111 00001"
                  inputMode="numeric"
                  autoComplete="off"
                />
              </div>
            </label>

            <button type="submit" className="btn btn--gold fo-submit" disabled={!canSubmit}>
              {saving ? 'Adding…' : 'Add owner'}
            </button>
          </form>
        </div>
      </div>

      {loading ? (
        <div className="p-empty">
          <p className="p-empty__text">Loading owners…</p>
        </div>
      ) : owners.length === 0 ? (
        <div className="p-empty">
          <h3 className="p-empty__title">No owners yet</h3>
          <p className="p-empty__text">Add your first salon owner using the form above.</p>
        </div>
      ) : (
        <div className="ptable-wrap">
          <table className="ptable">
            <thead>
              <tr>
                <th>Owner</th>
                <th>Mobile</th>
                <th>Salons</th>
                <th>Added</th>
              </tr>
            </thead>
            <tbody>
              {owners.map((o) => (
                <tr key={o.id}>
                  <td className="ptable__strong">{o.name}</td>
                  <td>+91 {o.phone}</td>
                  <td>
                    <span className={`badge ${o.salonCount > 0 ? 'badge--green' : 'badge--neutral'}`}>
                      {o.salonCount}
                    </span>
                  </td>
                  <td className="ptable__sub">{joinedLabel(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
