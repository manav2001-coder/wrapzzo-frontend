import { ArrowRight, Wallet } from 'lucide-react'
import { formatCurrency } from '@/lib/format'

/** The single most business-critical number on the dashboard, given a hero treatment instead of being
 * just another card in a grid -- a large figure, a decorative gradient, and a plain-language caption.
 * Clickable when there's real spend behind it, opening the same drilldown dialog every other chart uses. */
export function HeroSpendCard({ amount, onClick }: { amount: number; onClick: () => void }) {
  const clickable = amount > 0

  return (
    <button
      type="button"
      onClick={clickable ? onClick : undefined}
      disabled={!clickable}
      className={`relative flex h-full w-full flex-col justify-between overflow-hidden rounded-lg border bg-card p-6 text-left transition-transform ${clickable ? 'cursor-pointer hover:-translate-y-0.5' : 'cursor-default'}`}
    >
      <div
        className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full opacity-[0.12]"
        style={{ background: 'radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)' }}
      />
      <div className="relative flex items-center justify-between gap-2 text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
            <Wallet className="h-4 w-4" />
          </div>
          <span className="text-xs font-semibold tracking-wide uppercase">Monthly spend</span>
        </div>
        {clickable && (
          <span className="flex items-center gap-1 text-xs font-medium text-primary">
            View details <ArrowRight className="h-3 w-3" />
          </span>
        )}
      </div>

      <div className="relative mt-4">
        {amount > 0 ? (
          <>
            <p className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">{formatCurrency(amount)}</p>
            <p className="mt-2 text-sm text-muted-foreground">Orders approved and priced this calendar month.</p>
          </>
        ) : (
          <>
            <p className="text-4xl font-bold tracking-tight text-foreground/25 sm:text-5xl">{formatCurrency(0)}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              No spend recorded yet this month. Billable amounts appear here once a priced gift is delivered.
            </p>
          </>
        )}
      </div>
    </button>
  )
}
