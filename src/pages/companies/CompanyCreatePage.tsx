import { useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { createCompany } from '../../api/companies'
import type { OutletContext } from '../../layouts/AppShell'

export function CompanyCreatePage() {
  const { accessToken, onError } = useOutletContext<OutletContext>()
  const navigate = useNavigate()
  const [name, setName] = useState('')

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim()) return
    try {
      const company = await createCompany(accessToken, name.trim())
      navigate(`/companies/${company.id}`)
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className="card">
      <h2>Add company</h2>
      <form className="stacked-form" onSubmit={handleSubmit}>
        <label className="field">
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="btn-row">
          <button className="btn btn-primary" type="submit">
            Create
          </button>
          <button className="btn" type="button" onClick={() => navigate('/companies')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
