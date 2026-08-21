import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export function PageHeader({
  title,
  subtitle,
  backTo,
  actions,
}: {
  title: string
  subtitle?: string
  backTo?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        {backTo && (
          <Link to={backTo} className="mb-1 inline-flex items-center gap-1 text-sm text-text-muted hover:text-accent">
            <i className="pi pi-arrow-left text-xs" /> Back
          </Link>
        )}
        <h1 className="text-xl font-semibold tracking-tight text-text sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
