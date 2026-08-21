import { useEffect, useState } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { activateCompany, deactivateCompany, getCompany, updateCompany, uploadCompanyLogo, type Company } from '../../api/companies'
import type { OutletContext } from '../../layouts/AppShell'

export function CompanyEditPage() {
  const { id } = useParams<{ id: string }>()
  const { accessToken, onError } = useOutletContext<OutletContext>()
  const navigate = useNavigate()

  const [company, setCompany] = useState<Company | null>(null)
  const [name, setName] = useState('')

  async function load() {
    if (!id) return
    try {
      const loaded = await getCompany(accessToken, id)
      setCompany(loaded)
      setName(loaded.name)
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
      setCompany(await updateCompany(accessToken, id, name.trim()))
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleToggleStatus() {
    if (!id || !company) return
    try {
      setCompany(company.status === 'ACTIVE' ? await deactivateCompany(accessToken, id) : await activateCompany(accessToken, id))
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleLogoSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!id || !file) return
    try {
      setCompany(await uploadCompanyLogo(accessToken, id, file))
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err))
    }
  }

  if (!company) return null

  return (
    <div>
      <div className="page-header">
        <h2>{company.name}</h2>
        <div className="btn-row" style={{ marginBottom: 0 }}>
          <button className="btn" onClick={handleToggleStatus}>
            {company.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
          </button>
          <button className="btn" onClick={() => navigate('/companies')}>
            Back to list
          </button>
        </div>
      </div>

      <div className="card">
        <h2>Logo</h2>
        <div className="image-gallery">
          {company.logoUrl && (
            <div className="image-gallery-item">
              <img src={company.logoUrl} alt={company.name} />
            </div>
          )}
          <label className="btn">
            Upload logo
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={handleLogoSelected}
              hidden
            />
          </label>
        </div>
      </div>

      <div className="card">
        <h2>Details</h2>
        <form className="stacked-form" onSubmit={handleSave}>
          <label className="field">
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <button className="btn btn-primary" type="submit">
            Save
          </button>
        </form>
      </div>
    </div>
  )
}
