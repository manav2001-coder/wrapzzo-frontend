import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { listCompanies, type Company } from '../../api/companies'
import type { OutletContext } from '../../layouts/AppShell'

export function CompanyListPage() {
  const { accessToken, onError } = useOutletContext<OutletContext>()
  const [companies, setCompanies] = useState<Company[]>([])

  useEffect(() => {
    listCompanies(accessToken)
      .then(setCompanies)
      .catch((err) => onError(err instanceof Error ? err.message : String(err)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken])

  return (
    <div className="card">
      <div className="page-header">
        <h2>Companies</h2>
        <Link className="btn btn-primary" to="/companies/new">
          + Add company
        </Link>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Logo</th>
            <th>Name</th>
            <th>Status</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {companies.map((company) => (
            <tr key={company.id}>
              <td>
                {company.logoUrl ? (
                  <img src={company.logoUrl} alt={`${company.name} logo`} className="logo-thumb" />
                ) : (
                  <span className="logo-thumb logo-thumb-empty" />
                )}
              </td>
              <td>
                <Link to={`/companies/${company.id}`}>{company.name}</Link>
              </td>
              <td>
                <span className={`badge ${company.status === 'ACTIVE' ? 'badge-active' : 'badge-inactive'}`}>
                  {company.status}
                </span>
              </td>
              <td>{new Date(company.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
          {companies.length === 0 && (
            <tr className="empty-row">
              <td colSpan={4}>No companies yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
