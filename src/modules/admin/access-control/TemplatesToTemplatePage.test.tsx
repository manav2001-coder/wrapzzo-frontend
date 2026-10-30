import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { companyAdmin, template } from '@/test/tbac-fixtures'
import { renderWithProviders, screen, waitFor } from '@/test/test-utils'
import { TemplatesToTemplatePage } from './TemplatesToTemplatePage'

const currentUser = vi.hoisted(() => vi.fn())
const listTemplates = vi.hoisted(() => vi.fn())
const addTemplateReferences = vi.hoisted(() => vi.fn())
const removeTemplateReference = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/use-current-user', async (o) => ({ ...(await o<object>()), useCurrentUser: currentUser }))
vi.mock('@/api/templates', async (o) => ({ ...(await o<object>()), listTemplates, addTemplateReferences, removeTemplateReference }))

const top = template({ id: 't-top', name: 'Top', referencedTemplateIds: ['t-base'] })

async function openTop() {
  renderWithProviders(<TemplatesToTemplatePage />)
  await userEvent.click(screen.getByLabelText('Template'))
  await userEvent.click(await screen.findByText('Top'))
}

describe('TemplatesToTemplatePage', () => {
  beforeEach(() => {
    currentUser.mockReturnValue(companyAdmin(['template.view', 'template.edit']))
    listTemplates.mockReset().mockResolvedValue([
      top,
      template({ id: 't-base', name: 'Base' }),
      template({ id: 't-other', name: 'Other' }),
      template({ id: 't-loop', name: 'Loop' }),
      template({ id: 't-off', name: 'Retired', active: false }),
    ])
    addTemplateReferences.mockReset().mockResolvedValue({ added: 1, totalRequested: 2, errors: [{ templateId: 't-loop', name: 'Loop', reason: 'It would loop back on this template' }], template: top })
    removeTemplateReference.mockReset().mockResolvedValue(top)
  })

  it('lists what is included apart from what could be, never the template itself or an inactive one', async () => {
    await openTop()

    expect(await screen.findByLabelText('Base')).toBeInTheDocument()
    expect(screen.getByLabelText('Other')).toBeInTheDocument()
    expect(screen.queryByLabelText('Retired')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Top')).not.toBeInTheDocument()
  })

  it('adds several at once and says why a candidate was refused', async () => {
    await openTop()

    await userEvent.click(await screen.findByLabelText('Other'))
    await userEvent.click(screen.getByLabelText('Loop'))
    await userEvent.click(screen.getByRole('button', { name: /^Add/ }))

    await waitFor(() => expect(addTemplateReferences).toHaveBeenCalledWith('t-top', expect.arrayContaining(['t-other', 't-loop'])))
    expect(await screen.findByText(/It would loop back on this template/)).toBeInTheDocument()
    expect(screen.getByText('1 of 2 included.')).toBeInTheDocument()
  })

  it('removes an included template', async () => {
    await openTop()

    await userEvent.click(await screen.findByLabelText('Base'))
    await userEvent.click(screen.getByRole('button', { name: /^Remove/ }))

    await waitFor(() => expect(removeTemplateReference).toHaveBeenCalledWith('t-top', 't-base'))
  })
})
