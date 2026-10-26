import type * as React from 'react'

import { EmptyTable } from '@/components/data-table/empty-table'
import { ErrorTable } from '@/components/data-table/error-table'

/**
 * The body a client-mode `DataTable` shows when it has no rows: the load's failure (with Retry)
 * when there was one, otherwise the screen's own empty message. Client mode has no fetch of its own
 * to fail, so without this a failed list read as "nothing here yet".
 */
export function listEmptyBody({
  error,
  onRetry,
  icon,
  message,
  description,
  action,
}: {
  error: unknown
  onRetry: () => void
  icon?: React.ReactNode
  message: string
  description?: string
  action?: React.ReactNode
}): React.ReactNode {
  if (error) return <ErrorTable error={error} onRetry={onRetry} />
  return <EmptyTable icon={icon} message={message} description={description} action={action} />
}
