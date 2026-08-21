import { Tag } from 'primereact/tag'

const SEVERITY: Record<string, 'success' | 'danger' | 'warning' | 'secondary'> = {
  ACTIVE: 'success',
  INACTIVE: 'secondary',
  SUSPENDED: 'danger',
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return <Tag value={label ?? status} severity={SEVERITY[status] ?? 'secondary'} rounded className="whitespace-nowrap" />
}
