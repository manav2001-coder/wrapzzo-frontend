import { describe, expect, it } from 'vitest'

import { renderWithProviders, screen } from '@/test/test-utils'
import { ArtworkApprovalTrail } from './artwork-approval-trail'

const at = '2026-11-08T09:00:00Z'

describe('ArtworkApprovalTrail', () => {
  it('shows a level that was skipped, by whom, for whom, and why', () => {
    renderWithProviders(
      <ArtworkApprovalTrail
        steps={[
          { level: 0, decision: 'BYPASSED', decidedByName: 'Hari HO', onBehalfOfName: 'Aditi AM', comment: 'AM is on leave', decidedAt: at },
          { level: 1, decision: 'BYPASSED', decidedByName: 'Hari HO', onBehalfOfName: 'Ravi RM', comment: 'AM is on leave', decidedAt: at },
          { level: 2, decision: 'APPROVED', decidedByName: 'Hari HO', onBehalfOfName: null, comment: 'AM is on leave', decidedAt: at },
        ]}
      />,
    )

    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('MR review · skipped by Hari HO (for Aditi AM)')
    expect(items[0]).toHaveTextContent('“AM is on leave”')
    expect(items[1]).toHaveTextContent('Level 1 · skipped by Hari HO (for Ravi RM)')
    expect(items[2]).toHaveTextContent('Level 2 · approved by Hari HO')
    // The note is shown once, on the skipped steps -- not repeated on the approval itself.
    expect(items[2]).not.toHaveTextContent('AM is on leave')
  })
})
