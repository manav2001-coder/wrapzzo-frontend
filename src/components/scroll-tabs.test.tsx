import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { render, screen } from '@testing-library/react'
import { ScrollTabs } from './scroll-tabs'

const TABS = [
  { value: 'all', label: 'All', badge: 12 },
  { value: 'ready', label: 'Ready to print', badge: 2 },
  { value: 'review', label: 'Artwork in review' },
]

describe('ScrollTabs', () => {
  it('is a tab list with the picked one selected, and the counts beside the names', () => {
    render(<ScrollTabs tabs={TABS} value="ready" onValueChange={() => {}} />)
    expect(screen.getByRole('tablist')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Ready to print/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /All/ })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('tab', { name: /All/ })).toHaveTextContent('12')
    expect(screen.getByRole('tab', { name: 'Artwork in review' })).toBeInTheDocument()
  })

  it('tells the screen which one was tapped', async () => {
    const onValueChange = vi.fn()
    render(<ScrollTabs tabs={TABS} value="all" onValueChange={onValueChange} />)
    await userEvent.click(screen.getByRole('tab', { name: 'Artwork in review' }))
    expect(onValueChange).toHaveBeenCalledWith('review')
  })
})
