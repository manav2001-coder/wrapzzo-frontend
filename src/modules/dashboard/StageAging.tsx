import { AlertTriangle, CheckCircle2, ClipboardCheck, Cog, Palette, type LucideIcon } from 'lucide-react'

import type { InsightStage, StageAging as Stage } from '@/api/dashboard'
import { cn } from '@/lib/utils'

const META: Record<InsightStage, { label: string; icon: LucideIcon; tone: string }> = {
  APPROVAL: { label: 'Waiting for approval', icon: ClipboardCheck, tone: 'bg-violet-500/15 text-violet-600 dark:text-violet-400' },
  ARTWORK: { label: 'Artwork & proof', icon: Palette, tone: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  PRODUCTION: { label: 'In production', icon: Cog, tone: 'bg-sky-500/15 text-sky-600 dark:text-sky-400' },
}

/**
 * Where every open order is waiting, in the order they travel, and how long. A stage with orders past its limit turns red and says so --
 * that is the "who do I chase?" signal. Each tile opens the orders in it, longest-waiting first. A 2x2 grid on a phone, a row on a desktop.
 */
export function StageAgingCard({ stages, onSelectStage }: { stages: Stage[]; onSelectStage: (stage: InsightStage) => void }) {
  const open = stages.reduce((sum, s) => sum + s.count, 0)
  const stuck = stages.reduce((sum, s) => sum + s.stuck, 0)
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">Where orders are waiting</h2>
        <span className="text-xs text-muted-foreground tabular-nums">{open.toLocaleString('en-IN')} open</span>
      </div>
      {open === 0 ? (
        <div className="flex items-center gap-3 py-6">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-success/15 text-success">
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <p className="text-sm text-muted-foreground">Nothing is in progress right now.</p>
        </div>
      ) : (
        <>
          {stuck > 0 && (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
              {stuck} {stuck === 1 ? 'order has' : 'orders have'} been waiting longer than usual
            </p>
          )}
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {stages.map((s) => {
              const meta = META[s.stage]
              return (
                <button
                  key={s.stage}
                  type="button"
                  disabled={s.count === 0}
                  onClick={() => onSelectStage(s.stage)}
                  className={cn(
                    'flex min-h-[112px] flex-col items-start gap-2 rounded-xl border bg-background/50 p-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none',
                    s.count > 0 && 'hover:bg-muted',
                    s.stuck > 0 && 'border-destructive/40 bg-destructive/5',
                  )}
                >
                  <span className={cn('grid h-8 w-8 place-items-center rounded-lg', meta.tone)}>
                    <meta.icon className="h-4 w-4" />
                  </span>
                  <span className="text-2xl leading-none font-bold tabular-nums">{s.count}</span>
                  <span className="text-xs font-medium text-muted-foreground">{meta.label}</span>
                  {s.count > 0 && (
                    <span className={cn('text-[11px] leading-tight font-medium', s.stuck > 0 ? 'text-destructive' : 'text-muted-foreground')}>
                      {s.stuck > 0 ? `${s.stuck} over ${s.thresholdDays} days · oldest ${s.oldestDays}d` : `oldest ${s.oldestDays}d`}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}
