import { Factory } from 'lucide-react'

import type { VendorScore } from '@/api/dashboard'
import { cn } from '@/lib/utils'

const days = (d: number | null) => (d === null ? '—' : `${d}d`)
const rejectionPercent = (v: VendorScore) => (v.designs > 0 ? Math.round((v.designsRejected / v.designs) * 100) : null)

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-lg bg-muted/50 px-2 py-2 text-center">
      <dd className={cn('text-base leading-none font-bold tabular-nums', warn && 'text-destructive')}>{value}</dd>
      <dt className="mt-1 text-[11px] text-muted-foreground">{label}</dt>
    </div>
  )
}

/**
 * How each vendor did on the orders placed with them in the period: speed (days to dispatch), how many open orders have
 * dragged on, and how often their artwork was sent back. Only rendered for someone the server named vendors to (the company admin).
 * Cards on a phone, a table from tablet width.
 */
export function VendorScorecard({ vendors }: { vendors: VendorScore[] }) {
  if (vendors.length === 0) return null
  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
          <Factory className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-sm font-semibold">Vendor scorecard</h2>
          <p className="text-xs text-muted-foreground">Orders placed with each vendor in this period</p>
        </div>
      </div>

      <ul className="mt-4 flex flex-col gap-2 md:hidden">
        {vendors.map((v) => {
          const rej = rejectionPercent(v)
          return (
            <li key={v.vendorId} className="rounded-xl border bg-background/50 p-3">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-sm font-semibold">{v.name}</p>
                <p className="shrink-0 text-xs text-muted-foreground tabular-nums">{v.orders} orders</p>
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-2">
                <Stat label="Dispatched" value={String(v.dispatched)} />
                <Stat label="Open" value={String(v.open)} />
                <Stat label="Over 10 days" value={String(v.slowOpen)} warn={v.slowOpen > 0} />
                <Stat label="To dispatch" value={days(v.avgDaysToDispatch)} />
                <Stat label="Artwork sent back" value={rej === null ? '—' : `${rej}%`} warn={rej !== null && rej >= 30} />
              </dl>
            </li>
          )
        })}
      </ul>

      <div className="mt-4 hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Vendor</th>
              <th className="px-3 py-2 text-right font-medium">Orders</th>
              <th className="px-3 py-2 text-right font-medium">Dispatched</th>
              <th className="px-3 py-2 text-right font-medium">Open</th>
              <th className="px-3 py-2 text-right font-medium">Over 10 days</th>
              <th className="px-3 py-2 text-right font-medium">To dispatch</th>
              <th className="py-2 pl-3 text-right font-medium">Artwork sent back</th>
            </tr>
          </thead>
          <tbody>
            {vendors.map((v) => {
              const rej = rejectionPercent(v)
              return (
                <tr key={v.vendorId} className="border-b last:border-0">
                  <td className="py-2.5 pr-3 font-medium">{v.name}</td>
                  <td className="px-3 text-right tabular-nums">{v.orders}</td>
                  <td className="px-3 text-right tabular-nums">{v.dispatched}</td>
                  <td className="px-3 text-right tabular-nums">{v.open}</td>
                  <td className={cn('px-3 text-right tabular-nums', v.slowOpen > 0 && 'font-semibold text-destructive')}>{v.slowOpen}</td>
                  <td className="px-3 text-right tabular-nums">{days(v.avgDaysToDispatch)}</td>
                  <td className={cn('py-2.5 pl-3 text-right tabular-nums', rej !== null && rej >= 30 && 'font-semibold text-destructive')}>
                    {rej === null ? '—' : `${rej}% (${v.designsRejected}/${v.designs})`}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
