export interface CampaignGroup<T> {
  campaignId: string
  campaignName: string
  items: T[]
}

/** Groups a flat list of campaign-linked records (Orders, Submissions, ...) by their campaign, preserving first-seen order. */
export function groupByCampaign<T extends { campaignId: string; campaignName: string }>(items: T[]): CampaignGroup<T>[] {
  const groups: CampaignGroup<T>[] = []
  const byId = new Map<string, CampaignGroup<T>>()
  for (const item of items) {
    let group = byId.get(item.campaignId)
    if (!group) {
      group = { campaignId: item.campaignId, campaignName: item.campaignName, items: [] }
      byId.set(item.campaignId, group)
      groups.push(group)
    }
    group.items.push(item)
  }
  return groups
}
