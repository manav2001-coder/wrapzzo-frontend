/** Hex colors matching StatusBadge's PrimeReact Tag severities -- kept in sync so charts and badges agree visually. */
export const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#6b7280',
  ACTIVE: '#22c55e',
  CLOSED: '#6b7280',
  SUBMITTED: '#3b82f6',
  RESUBMITTED: '#3b82f6',
  APPROVED: '#22c55e',
  REJECTED: '#ef4444',
  PROCESSING: '#3b82f6',
  PRODUCTION_QUEUE: '#f59e0b',
  DISPATCHED: '#f59e0b',
  RECEIVED_AT_WAREHOUSE: '#f59e0b',
  OUT_FOR_DELIVERY: '#f59e0b',
  DELIVERED: '#22c55e',
  CANCELLED: '#ef4444',
}

export function statusColor(status: string): string {
  return STATUS_COLORS[status] ?? '#6b7280'
}
