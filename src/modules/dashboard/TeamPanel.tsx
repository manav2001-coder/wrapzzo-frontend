import { formatDistanceToNowStrict } from 'date-fns'
import { Search, Users } from 'lucide-react'
import { useMemo, useState } from 'react'

import type { TeamMember } from '@/api/dashboard'
import { EmptyState } from '@/components/empty-state'
import { cn } from '@/lib/utils'

type Filter = 'all' | 'quiet'
type Sort = 'requested' | 'coverage' | 'name'

const count = (n: number) => n.toLocaleString('en-IN')
const coveragePercent = (m: TeamMember) => (m.doctorsAssigned > 0 ? Math.round((m.doctorsCovered / m.doctorsAssigned) * 100) : null)
const lastSeen = (m: TeamMember) => (m.lastActivityAt ? `${formatDistanceToNowStrict(new Date(m.lastActivityAt))} ago` : 'Never')

function CoverageBar({ member }: { member: TeamMember }) {
  const percent = coveragePercent(member)
  if (percent === null) return <span className="text-xs text-muted-foreground">No doctors yet</span>
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-full min-w-16 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${member.doctorsCovered} of ${member.doctorsAssigned} doctors covered`}>
        <div className={cn('h-full rounded-full', percent >= 60 ? 'bg-success' : percent >= 25 ? 'bg-amber-500' : 'bg-destructive')} style={{ width: `${percent}%` }} />
      </div>
      <span className="w-20 shrink-0 text-xs text-muted-foreground tabular-nums">
        {member.doctorsCovered}/{member.doctorsAssigned}
      </span>
    </div>
  )
}

function Initials({ name }: { name: string }) {
  const letters = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
  return <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">{letters}</span>
}

/**
 * One row per person below the viewer, for the chosen period. Sorted so the quiet ones come first by default -- the people to nudge.
 * Cards on a phone (no sideways scrolling), a table from tablet width up.
 */
export function TeamPanel({ team, teamSize, unitLabel }: { team: TeamMember[]; teamSize: number; unitLabel?: string }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<Sort>('requested')

  const quiet = useMemo(() => team.filter((m) => m.requested === 0).length, [team])
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return team
      .filter((m) => (filter === 'quiet' ? m.requested === 0 : true))
      .filter((m) => !q || m.name.toLowerCase().includes(q) || m.unitName.toLowerCase().includes(q))
      .sort((a, b) => {
        if (sort === 'name') return a.name.localeCompare(b.name)
        if (sort === 'coverage') return (coveragePercent(a) ?? -1) - (coveragePercent(b) ?? -1)
        return a.requested - b.requested || a.name.localeCompare(b.name)
      })
  }, [team, query, filter, sort])

  if (team.length === 0) {
    return <EmptyState icon={Users} title="No one to show yet" description="People who report to you appear here once they have doctors or orders." />
  }

  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Your team</h2>
          <p className="text-xs text-muted-foreground">
            {quiet > 0 ? `${quiet} of ${count(team.length)} haven't requested a PEL in this period.` : 'Everyone has requested a PEL in this period.'}
            {teamSize > team.length && ` Showing ${team.length} of ${count(teamSize)}.`}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="relative block flex-1">
          <span className="sr-only">Search people{unitLabel ? ` or ${unitLabel}` : ''}</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or area"
            className="h-11 w-full rounded-xl border bg-background pr-3 pl-9 text-base outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:text-sm"
          />
        </label>
        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {([['all', 'Everyone'], ['quiet', `Needs a nudge${quiet ? ` (${quiet})` : ''}`]] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              className={cn(
                'min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none',
                filter === value ? 'border-primary bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted',
              )}
            >
              {label}
            </button>
          ))}
          <select
            aria-label="Sort by"
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="min-h-11 shrink-0 rounded-full border bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
          >
            <option value="requested">Fewest PELs first</option>
            <option value="coverage">Lowest coverage first</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No one matches.</p>
      ) : (
        <>
          {/* Phone: one card per person. */}
          <ul className="mt-3 flex flex-col gap-2 md:hidden">
            {rows.map((m) => (
              <li key={m.userId} className="rounded-xl border bg-background/50 p-3">
                <div className="flex items-center gap-3">
                  <Initials name={m.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{m.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{m.unitName || '—'}</p>
                  </div>
                  {m.requested === 0 && <span className="shrink-0 rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-warning">Nudge</span>}
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                  {[['Requested', m.requested], ['Dispatched', m.dispatched], ['In progress', m.inPipeline]].map(([label, value]) => (
                    <div key={label as string} className="rounded-lg bg-muted/50 py-2">
                      <dd className="text-lg leading-none font-bold tabular-nums">{count(value as number)}</dd>
                      <dt className="mt-1 text-[11px] text-muted-foreground">{label}</dt>
                    </div>
                  ))}
                </dl>
                <div className="mt-3">
                  <CoverageBar member={m} />
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">Last request {lastSeen(m)}</p>
              </li>
            ))}
          </ul>

          {/* Tablet and up: a table. */}
          <div className="mt-3 hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Person</th>
                  <th className="px-3 py-2 text-right font-medium">Requested</th>
                  <th className="px-3 py-2 text-right font-medium">Dispatched</th>
                  <th className="px-3 py-2 text-right font-medium">In progress</th>
                  <th className="px-3 py-2 font-medium">Doctors covered</th>
                  <th className="py-2 pl-3 text-right font-medium">Last request</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.userId} className="border-b last:border-0">
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-3">
                        <Initials name={m.name} />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{m.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{m.unitName || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className={cn('px-3 text-right font-semibold tabular-nums', m.requested === 0 && 'text-warning')}>{count(m.requested)}</td>
                    <td className="px-3 text-right tabular-nums">{count(m.dispatched)}</td>
                    <td className="px-3 text-right tabular-nums">{count(m.inPipeline)}</td>
                    <td className="w-56 px-3">
                      <CoverageBar member={m} />
                    </td>
                    <td className="py-2.5 pl-3 text-right text-xs text-muted-foreground">{lastSeen(m)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}
