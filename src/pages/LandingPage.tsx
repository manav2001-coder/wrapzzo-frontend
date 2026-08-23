import { Mail } from 'lucide-react'
import { Button } from 'primereact/button'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAppSelector } from '@/app/hooks'

const ACCENT = '#4f46e5'

const SOLUTIONS = [
  {
    title: 'Employee Gifting',
    description: 'Onboarding kits, milestones, and everyday recognition for your team.',
    caption: 'New-hire welcome kits, delivered the day an offer is accepted.',
  },
  {
    title: 'Client Gifting',
    description: 'Thoughtful gifting that scales with your client base.',
    caption: 'Renewal and anniversary gifts, sent on schedule.',
  },
  {
    title: 'Distributor / Dealer Gifting',
    description: 'Recognition programs for your distribution and dealer network.',
    caption: 'Nationwide dealer incentive gifting, tracked by territory.',
  },
  {
    title: 'Pharma / HCP Gifting',
    description: 'Compliant gifting and engagement for healthcare professionals.',
    caption: 'Doctor engagement gifting, handled with the care the sector needs.',
  },
  {
    title: 'Events & Conferences',
    description: 'Welcome gifts and merchandise for conferences and field events.',
    caption: 'Conference welcome kits, ready for attendees on day one.',
  },
  {
    title: 'Welcome Kits',
    description: 'Onboarding and induction kits for new employees or partners.',
    caption: 'Branded welcome kits, shipped nationwide on your timeline.',
  },
  {
    title: 'Rewards & Recognition',
    description: 'Performance-tied gifting for milestones and achievements.',
    caption: 'Quarterly recognition gifting, delivered on time, every time.',
  },
  {
    title: 'Partner Gifting',
    description: 'Gifting for the partners and vendors who help your business run.',
    caption: 'Year-end appreciation gifting for your partner network.',
  },
]

const FOOTER_PLATFORM_LINKS = ['Gift Store', 'Quick Gifts', 'Bulk Gifting', 'Campaigns']

function GridBackdrop({ dark }: { dark: boolean }) {
  const line = dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)'
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundImage: `linear-gradient(to right, ${line} 1px, transparent 1px), linear-gradient(to bottom, ${line} 1px, transparent 1px)`,
        backgroundSize: '48px 48px',
      }}
    />
  )
}

export function LandingPage() {
  const navigate = useNavigate()
  const accessToken = useAppSelector((state) => state.auth.accessToken)
  const vendorAccessToken = useAppSelector((state) => state.vendorAuth.accessToken)

  if (accessToken) {
    return <Navigate to="/admin/companies" replace />
  }
  if (vendorAccessToken) {
    return <Navigate to="/vendor" replace />
  }

  return (
    <div className="min-h-svh bg-white text-neutral-900">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold" style={{ color: ACCENT }}>
              W
            </span>
            <span className="text-lg font-semibold tracking-tight text-neutral-900">Wrappzo</span>
          </div>

          <a href="#solutions" className="hidden text-sm font-medium text-neutral-600 hover:text-neutral-900 sm:inline">
            Solutions
          </a>

          <Button
            label="Log in"
            onClick={() => navigate('/login')}
            className="rounded-full border-none bg-black px-5 py-2.5 font-medium text-white hover:bg-neutral-800"
          />
        </div>
      </header>

      <section className="relative isolate overflow-hidden bg-neutral-50">
        <GridBackdrop dark={false} />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(ellipse 60% 50% at 50% 0%, ${ACCENT}1a, transparent 60%)` }}
        />

        <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-24 text-center sm:px-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1 text-sm text-neutral-600 shadow-sm">
            <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: ACCENT }} />
            Corporate gifting platform
          </div>

          <h1 className="text-balance text-5xl font-bold tracking-tight text-neutral-950 sm:text-6xl">
            A gifting platform for every relationship you manage.
          </h1>
          <p className="max-w-xl text-balance text-lg text-neutral-500">
            Campaigns, vendors, orders, and every recipient roster &mdash; Wrappzo runs the whole corporate gifting
            workflow, in one place.
          </p>

          <Button
            label="Log in"
            onClick={() => navigate('/login')}
            className="mt-2 rounded-full border-none bg-black px-6 py-3 font-medium text-white hover:bg-neutral-800"
          />
        </div>
      </section>

      <section id="solutions" className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-neutral-950">
            Built for every kind of corporate gifting
          </h2>
          <p className="mt-3 text-base text-neutral-500">
            Whoever you&apos;re gifting &mdash; employees, clients, distributors, healthcare professionals, or
            partners &mdash; it runs through the same platform.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {SOLUTIONS.map(({ title, description, caption }) => (
            <div key={title} className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-8">
              <span className="h-1 w-8 rounded-full" style={{ backgroundColor: ACCENT }} />
              <p className="text-lg font-semibold text-neutral-950">{title}</p>
              <p className="text-sm text-neutral-500">{description}</p>
              <div className="mt-2 border-t border-neutral-200 pt-3">
                <p className="text-sm text-neutral-400">{caption}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="relative isolate overflow-hidden bg-neutral-950 text-white">
        <GridBackdrop dark />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(ellipse 60% 50% at 50% 30%, ${ACCENT}40, transparent 60%)` }}
        />

        <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 py-24 text-center sm:px-6">
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Ready to manage your next gifting program?
          </h2>
          <p className="text-base text-neutral-400">
            Log in to see campaigns, orders, and rosters for every company on Wrappzo.
          </p>

          <div className="mt-2 flex flex-wrap items-center justify-center gap-6">
            <Button
              label="Log in"
              onClick={() => navigate('/login')}
              className="rounded-full border-none bg-white px-6 py-3 font-medium text-black hover:bg-neutral-200"
            />
            <a href="mailto:hello@wrappzo.com" className="flex items-center gap-2 text-sm text-neutral-300 hover:text-white">
              <Mail className="size-4" strokeWidth={1.75} />
              hello@wrappzo.com
            </a>
          </div>
        </div>
      </section>

      <footer className="bg-neutral-950 pt-16 pb-8 text-neutral-400">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:grid-cols-3 sm:px-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold" style={{ color: ACCENT }}>
                W
              </span>
              <span className="text-base font-semibold text-white">Wrappzo</span>
            </div>
            <p className="max-w-xs text-sm text-neutral-500">
              Corporate gifting and custom merchandise, sourced and delivered by Wrappzo.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">Platform</p>
            {FOOTER_PLATFORM_LINKS.map((label) => (
              <span key={label} className="text-sm text-neutral-400">
                {label}
              </span>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">Account</p>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-fit border-0 bg-transparent p-0 text-left text-sm text-neutral-400 hover:text-white"
            >
              Log in
            </button>
            <a href="mailto:hello@wrappzo.com" className="w-fit text-sm text-neutral-400 hover:text-white">
              hello@wrappzo.com
            </a>
          </div>
        </div>

        <div className="mx-auto mt-12 max-w-6xl border-t border-neutral-800 px-4 pt-6 text-xs text-neutral-500 sm:px-6">
          &copy; {new Date().getFullYear()} Wrappzo. Operated by Orange Dot Solutions. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
