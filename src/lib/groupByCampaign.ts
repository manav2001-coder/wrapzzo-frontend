import type { Order } from '@/api/orders'

export interface CampaignGroup<T> {
  campaignId: string
  campaignName: string
  items: T[]
}

/**
 * Groups a flat list of Orders by their campaign, preserving first-seen order. A Quick Gift
 * order has no campaign -- those are bucketed into one synthetic "Quick Gift" group per
 * company, so a platform-wide (cross-company) view never merges different companies' requests.
 */
export function groupByCampaign<T extends Order>(items: T[]): CampaignGroup<T>[] {
  const groups: CampaignGroup<T>[] = []
  const byId = new Map<string, CampaignGroup<T>>()
  for (const item of items) {
    const id = item.campaignId ?? `quick-gift:${item.companyId}`
    const name = item.campaignName ?? 'Quick Gift'
    let group = byId.get(id)
    if (!group) {
      group = { campaignId: id, campaignName: name, items: [] }
      byId.set(id, group)
      groups.push(group)
    }
    group.items.push(item)
  }
  return groups
}
