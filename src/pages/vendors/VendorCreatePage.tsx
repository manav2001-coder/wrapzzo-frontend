import { useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { addVendor, type AddVendorResult } from '../../api/vendors'
import type { OutletContext } from '../../layouts/AppShell'

export function VendorCreatePage() {
  const { accessToken, onError } = useOutletContext<OutletContext>()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [result, setResult] = useState<AddVendorResult | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim() || !contactEmail.trim()) return
    try {
      setResult(
        await addVendor(accessToken, {
          name: name.trim(),
          contactEmail: contactEmail.trim(),
          contactPhone: contactPhone.trim() || undefined,
        }),
      )
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err))
    }
  }

  if (result) {
    return (
      <div className="card">
        <h2>Vendor added</h2>
        <p className="app-subtitle">
          Share these credentials with {result.vendor.name} manually -- this password won't be shown again.
        </p>
        <pre className="stacked-form" style={{ fontFamily: 'monospace', fontSize: 14 }}>
          Email: {result.vendor.contactEmail}
          {'\n'}
          Password: {result.temporaryPassword}
        </pre>
        <button className="btn btn-primary" onClick={() => navigate(`/vendors/${result.vendor.id}`)}>
          Done
        </button>
      </div>
    )
  }

  return (
    <div className="card">
      <h2>Add vendor</h2>
      <form className="stacked-form" onSubmit={handleSubmit}>
        <label className="field">
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field">
          Contact email
          <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
        </label>
        <label className="field">
          Contact phone (optional)
          <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
        </label>
        <p className="app-subtitle" style={{ margin: '0 0 16px' }}>
          A secure password will be generated automatically and shown once after creation.
        </p>
        <div className="btn-row">
          <button className="btn btn-primary" type="submit">
            Create
          </button>
          <button className="btn" type="button" onClick={() => navigate('/vendors')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
