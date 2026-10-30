import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { renderWithProviders, screen } from '@/test/test-utils'
import { TransferList } from './transfer-list'

function setup(overrides: Partial<React.ComponentProps<typeof TransferList>> = {}) {
  const onAdd = vi.fn()
  const onRemove = vi.fn()
  renderWithProviders(
    <TransferList
      available={[{ id: 'a', label: 'Alpha' }, { id: 'b', label: 'Beta' }]}
      assigned={[{ id: 'c', label: 'Gamma' }]}
      onAdd={onAdd}
      onRemove={onRemove}
      availableTitle="Available"
      assignedTitle="Assigned"
      searchLabel="Search"
      addLabel="Add"
      removeLabel="Remove"
      emptyAvailable="none available"
      emptyAssigned="none assigned"
      {...overrides}
    />,
  )
  return { onAdd, onRemove }
}

describe('TransferList', () => {
  it('hands the ticked ids to onAdd and onRemove', async () => {
    const { onAdd, onRemove } = setup()

    await userEvent.click(screen.getByLabelText('Alpha'))
    await userEvent.click(screen.getByLabelText('Beta'))
    await userEvent.click(screen.getByRole('button', { name: /^Add/ }))
    expect(onAdd).toHaveBeenCalledWith(['a', 'b'])

    await userEvent.click(screen.getByLabelText('Gamma'))
    await userEvent.click(screen.getByRole('button', { name: /^Remove/ }))
    expect(onRemove).toHaveBeenCalledWith(['c'])
  })

  it('narrows a list with its search box', async () => {
    setup()

    await userEvent.type(screen.getByLabelText('Search: Available'), 'bet')

    expect(screen.queryByLabelText('Alpha')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Beta')).toBeInTheDocument()
  })

  it('does nothing while disabled', () => {
    setup({ disabled: true })

    expect(screen.getByLabelText('Alpha')).toBeDisabled()
    expect(screen.getByRole('button', { name: /^Add/ })).toBeDisabled()
  })

  it('says so when a side is empty', () => {
    setup({ available: [] })

    expect(screen.getByText('none available')).toBeInTheDocument()
  })
})
