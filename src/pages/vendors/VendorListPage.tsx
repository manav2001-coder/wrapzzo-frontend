import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { listVendors, type Vendor } from '../../api/vendors'
import type { OutletContext } from '../../layouts/AppShell'

export function VendorListPage() {
  const { accessToken, onError } = useOutletContext<OutletContext>()
  const [vendors, setVendors] = useState<Vendor[]>([])

  useEffect(() => {
    listVendors(accessToken)
      .then(setVendors)
      .catch((err) => onError(err instanceof Error ? err.message : String(err)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken])

  return (
    <div className="card">
      <div className="page-header">
        <h2>Vendors</h2>
        <Link className="btn btn-primary" to="/vendors/new">
          + Add vendor
        </Link>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Contact email</th>
            <th>Phone</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {vendors.map((vendor) => (
            <tr key={vendor.id}>
              <td>
                <Link to={`/vendors/${vendor.id}`}>{vendor.name}</Link>
              </td>
              <td>{vendor.contactEmail}</td>
              <td>{vendor.contactPhone ?? '-'}</td>
              <td>
                <span className={`badge ${vendor.status === 'ACTIVE' ? 'badge-active' : 'badge-inactive'}`}>
                  {vendor.status}
                </span>
              </td>
            </tr>
          ))}
          {vendors.length === 0 && (
            <tr className="empty-row">
              <td colSpan={4}>No vendors yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
