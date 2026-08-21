import { useEffect, useState } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { editVendor, getVendor, reactivateVendor, suspendVendor, type Vendor } from '../../api/vendors'
import type { OutletContext } from '../../layouts/AppShell'

export function VendorEditPage() {
  const { id } = useParams<{ id: string }>()
  const { accessToken, onError } = useOutletContext<OutletContext>()
  const navigate = useNavigate()

  const [vendor, setVendor] = useState<Vendor | null>(null)
  const [name, setName] = useState('')
  const [contactPhone, setContactPhone] = useState('')

  async function load() {
    if (!id) return
    try {
      const loaded = await getVendor(accessToken, id)
      setVendor(loaded)
      setName(loaded.name)
      setContactPhone(loaded.contactPhone ?? '')
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err))
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, accessToken])

  async function handleSave(event: React.FormEvent) {
    event.preventDefault()
    if (!id || !name.trim()) return
    try {
      setVendor(await editVendor(accessToken, id, { name: name.trim(), contactPhone: contactPhone.trim() || undefined }))
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleToggleStatus() {
    if (!id || !vendor) return
    try {
      setVendor(vendor.status === 'ACTIVE' ? await suspendVendor(accessToken, id) : await reactivateVendor(accessToken, id))
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err))
    }
  }

  if (!vendor) return null

  return (
    <div>
      <div className="page-header">
        <h2>{vendor.name}</h2>
        <div className="btn-row" style={{ marginBottom: 0 }}>
          <button className="btn" onClick={handleToggleStatus}>
            {vendor.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
          </button>
          <button className="btn" onClick={() => navigate('/vendors')}>
            Back to list
          </button>
        </div>
      </div>

      <div className="card">
        <h2>Details</h2>
        <p className="app-subtitle">Contact email: {vendor.contactEmail} (login identifier, not editable here)</p>
        <form className="stacked-form" onSubmit={handleSave}>
          <label className="field">
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="field">
            Contact phone
            <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
          </label>
          <button className="btn btn-primary" type="submit">
            Save
          </button>
        </form>
      </div>
    </div>
  )
}
