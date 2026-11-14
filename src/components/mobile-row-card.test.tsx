import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { MobileRowCard } from './mobile-row-card'

describe('MobileRowCard', () => {
  it('renders title, lines and footer, skipping empty lines', () => {
    render(<MobileRowCard title="ORD-1" lines={['PEL × 10', null, '']} footer="Patna · 10 Nov" />)
    expect(screen.getByText('ORD-1')).toBeInTheDocument()
    expect(screen.getByText('PEL × 10')).toBeInTheDocument()
    expect(screen.getByText('Patna · 10 Nov')).toBeInTheDocument()
  })

  it('is a button that fires onClick when tappable', async () => {
    const onClick = vi.fn()
    render(<MobileRowCard title="ORD-2" onClick={onClick} label="Open ORD-2" />)
    await userEvent.click(screen.getByRole('button', { name: 'Open ORD-2' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('is a link when given a destination', () => {
    render(
      <MemoryRouter>
        <MobileRowCard title="ORD-3" to="/orders/3" label="Open ORD-3" />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Open ORD-3' })).toHaveAttribute('href', '/orders/3')
  })
})
