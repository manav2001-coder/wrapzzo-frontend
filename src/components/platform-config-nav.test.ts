import { describe, expect, it } from 'vitest'

import { flattenNavItems } from '@/components/nav/nav-types'
import { buildNav } from '@/components/nav/use-nav'
import { ADMIN_NAV, COMPANY_NAV } from '@/components/sidebar-nav-config'
import { P, type PermissionRequirement } from '@/lib/permissions'

const urls = (source: typeof ADMIN_NAV, allowed: readonly string[]) =>
  flattenNavItems(
    buildNav(source, {
      t: (key) => key,
      can: (permission?: PermissionRequirement) => permission === undefined || [permission].flat().some((key) => allowed.includes(key)),
    }),
  ).map((item) => item.url)

describe('Platform Configuration nav', () => {
  it('lists Background jobs for someone who holds the jobs key', () => {
    expect(urls(ADMIN_NAV, [P.PLATFORM_JOBS_VIEW])).toContain('/platform-config/jobs')
  })

  it('hides it from platform staff without the key', () => {
    expect(urls(ADMIN_NAV, [P.PLATFORM_COMPANY_VIEW])).not.toContain('/platform-config/jobs')
  })

  it('is never in a company user’s menu', () => {
    expect(urls(COMPANY_NAV, Object.values(P))).not.toContain('/platform-config/jobs')
  })
})
