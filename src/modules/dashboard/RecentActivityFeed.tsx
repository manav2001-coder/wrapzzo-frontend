import { Bolt, CheckCircle2, Circle, History, PlusCircle, Send, XCircle, type LucideIcon } from 'lucide-react'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import type { ActivityItem } from '@/api/dashboard'

/** "submitted/resubmitted a recipient for" and "approved/rejected a submission for" -- as opposed to
 * "created campaign", which should land on the campaign's default (Audience) tab, not Submissions. */
function isSubmissionActivity(verb: string): boolean {
  return verb.includes('submission') || verb.includes('recipient for')
}

/** Maps an activity's verb to an icon + color so the feed reads at a glance -- an approval looks different
 * from a rejection, which looks different from something just being created or sent for review. */
function activityStyle(verb: string): { icon: LucideIcon; colorClass: string } {
  if (verb.includes('rejected')) return { icon: XCircle, colorClass: 'bg-red-500/10 text-red-500' }
  if (verb.includes('approved') || verb.includes('delivered')) return { icon: CheckCircle2, colorClass: 'bg-emerald-500/10 text-emerald-500' }
  if (verb.includes('dispatched')) return { icon: Send, colorClass: 'bg-sky-500/10 text-sky-500' }
  if (verb.includes('created')) return { icon: PlusCircle, colorClass: 'bg-primary/10 text-primary' }
  if (verb.includes('requested') || verb.includes('submitted')) return { icon: Bolt, colorClass: 'bg-amber-500/10 text-amber-500' }
  return { icon: Circle, colorClass: 'bg-primary/10 text-primary' }
}

/** A real icon-coded timeline (connected by a rail) instead of a flat list of blue dots -- what kind of
 * event each row is should be visible before reading a single word of the sentence. */
export function RecentActivityFeed({ items, onSelectQuickGift }: { items: ActivityItem[]; onSelectQuickGift: (id: string) => void }) {
  return (
    <div className="flex h-[420px] flex-col rounded-lg border bg-card p-5">
      <div className="mb-3 flex shrink-0 items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
          <History className="h-4 w-4" />
        </div>
        <p className="text-sm font-semibold text-foreground">Recent activity</p>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-center text-sm text-muted-foreground">Nothing new.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="relative flex flex-col">
            {items.map((item, i) => {
              const { icon: Icon, colorClass } = activityStyle(item.verb)
              const isLast = i === items.length - 1
              const content = (
                <>
                  <div className="relative flex shrink-0 flex-col items-center">
                    <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${colorClass}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    {!isLast && <div className="w-px flex-1 bg-border" />}
                  </div>
                  <div className="min-w-0 flex-1 pb-4">
                    <p className="text-sm text-foreground">
                      <span className="font-medium">{item.actorName}</span> {item.verb} <span className="font-medium">{item.subject}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{format(new Date(item.at), 'dd MMM, h:mm a')}</p>
                  </div>
                </>
              )
              if (item.campaignId) {
                return (
                  <Link
                    key={i}
                    to={`/campaigns/${item.campaignId}`}
                    state={isSubmissionActivity(item.verb) ? { tab: 'submissions' } : undefined}
                    className="-mx-1 flex gap-3 rounded-lg px-1 hover:bg-muted"
                  >
                    {content}
                  </Link>
                )
              }
              if (item.quickGiftId) {
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onSelectQuickGift(item.quickGiftId!)}
                    className="-mx-1 flex gap-3 rounded-lg border-none bg-transparent px-1 text-left hover:bg-muted"
                  >
                    {content}
                  </button>
                )
              }
              return (
                <div key={i} className="flex gap-3">
                  {content}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
