import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { OrderDesign } from '@/api/orderDesigns'
import { renderWithProviders, screen } from '@/test/test-utils'
import { ArtworkReview } from './artwork-review'

const listOrderDesigns = vi.hoisted(() => vi.fn())
vi.mock('@/api/orderDesigns', async (o) => ({ ...(await o<object>()), listOrderDesigns }))

const design = (extra: Partial<OrderDesign> = {}): OrderDesign => ({
  id: 'd-1',
  orderId: 'o-1',
  versionNo: 2,
  fileUrl: 'https://files.test/proof.pdf',
  fileName: '566129_Rakesh-Aggarwal_Ashwani-Sharma_v2.pdf',
  status: 'PENDING_REVIEW',
  reviewedByUserName: null,
  firstApprovedByUserName: null,
  firstApprovedAt: null,
  reviewComment: null,
  reviewedAt: null,
  approvalLevel: null,
  approvalLevels: null,
  waitingOnName: null,
  approvals: [],
  createdAt: '2026-11-17T15:06:07Z',
  ...extra,
})

describe('ArtworkReview -- who a proof is waiting on', () => {
  beforeEach(() => listOrderDesigns.mockReset().mockResolvedValue([design()]))

  it('says "Waiting on you" only to the person whose review it is, who can act on it', async () => {
    renderWithProviders(<ArtworkReview orderId="o-1" artworkRequired />)
    expect(await screen.findByText('Waiting on you')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument()
  })

  it('tells someone who is only watching (an RM, the Head Office) that it waits on the requester, and gives them nothing to decide', async () => {
    renderWithProviders(<ArtworkReview orderId="o-1" artworkRequired readOnly />)
    expect(await screen.findByText('Waiting for the requester to review')).toBeInTheDocument()
    expect(screen.queryByText('Waiting on you')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument()
  })

  it('leaves the other states as they were for a watcher: a proof sent back is still "Changes requested"', async () => {
    listOrderDesigns.mockResolvedValue([design({ status: 'REJECTED', reviewComment: 'Match the font' })])
    renderWithProviders(<ArtworkReview orderId="o-1" artworkRequired readOnly />)
    expect(await screen.findByText('Changes requested')).toBeInTheDocument()
  })
})
