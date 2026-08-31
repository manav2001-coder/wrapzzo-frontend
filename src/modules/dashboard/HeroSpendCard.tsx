import { formatCurrency } from '@/lib/format'

/** The single most business-critical number on the dashboard, given a hero treatment instead of being
 * just another card in a grid -- a large figure, a decorative gradient, and a plain-language caption. */
export function HeroSpendCard({ amount }: { amount: number }) {
  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-border bg-surface p-6">
      <div
        className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full opacity-[0.12]"
        style={{ background: 'radial-gradient(circle, var(--color-accent) 0%, transparent 70%)' }}
      />
      <div className="relative flex items-center gap-2 text-text-muted">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-accent/10 text-accent">
          <i className="pi pi-wallet text-sm" />
        </div>
        <span className="text-xs font-semibold tracking-wide uppercase">Monthly spend</span>
      </div>

      <div className="relative mt-4">
        {amount > 0 ? (
          <>
            <p className="text-4xl font-bold tracking-tight text-text sm:text-5xl">{formatCurrency(amount)}</p>
            <p className="mt-2 text-sm text-text-muted">Delivered gifts, priced and fulfilled this calendar month.</p>
          </>
        ) : (
          <>
            <p className="text-4xl font-bold tracking-tight text-text/25 sm:text-5xl">{formatCurrency(0)}</p>
            <p className="mt-2 text-sm text-text-muted">
              No spend recorded yet this month. Billable amounts appear here once a priced gift is delivered.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
