import { describe, expect, it } from 'vitest'

import { renderWithProviders, screen } from '@/test/test-utils'
import { ArtworkApprovalTrail } from './artwork-approval-trail'

const at = '2026-11-08T09:00:00Z'

describe('ArtworkApprovalTrail', () => {
  it('shows each level in order, who signed it, and who they signed for when it was cover', () => {
    renderWithProviders(
      <ArtworkApprovalTrail
        steps={[
          { level: 0, decision: 'APPROVED', decidedByName: 'Aditi AM', onBehalfOfName: null, comment: null, decidedAt: at },
          { level: 1, decision: 'APPROVED', decidedByName: 'Neha', onBehalfOfName: 'Ravi RM', comment: null, decidedAt: at },
          { level: 2, decision: 'REJECTED', decidedByName: 'Hari HO', onBehalfOfName: null, comment: 'Wrong logo', decidedAt: at },
        ]}
      />,
    )

    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('MR review · approved by Aditi AM')
    expect(items[1]).toHaveTextContent('Level 1 · approved by Neha')
    expect(items[1]).toHaveTextContent('Ravi RM')
    expect(items[2]).toHaveTextContent('Level 2')
    // Nothing is ever marked as skipped: the cycle runs in order.
    expect(document.body.textContent).not.toMatch(/skipped/i)
  })
})
