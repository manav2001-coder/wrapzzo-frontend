import type { ReactNode } from 'react'

import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

/**
 * A label over one input with its error or hint under it -- for hand-built forms outside
 * FormGenerator (row editors, small dialogs). The label is a real <label for>, so the input is
 * found by its name, and the error replaces the hint rather than stacking under it.
 */
export function LabelledField({
  id,
  label,
  hint,
  error,
  className,
  children,
}: {
  id: string
  label: ReactNode
  hint?: string
  error?: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}
