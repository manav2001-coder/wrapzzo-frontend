import { afterEach, describe, expect, it, vi } from 'vitest'

import { downloadBlob } from './download'

describe('downloadBlob', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('clicks an anchor with the right download name, and revokes the URL only after this tick', () => {
    vi.useFakeTimers()
    URL.createObjectURL = vi.fn(() => 'blob:x')
    URL.revokeObjectURL = vi.fn()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    downloadBlob(new Blob(['a']), 'orders.xlsx')

    const anchor = click.mock.contexts[0] as HTMLAnchorElement
    expect(anchor.download).toBe('orders.xlsx')
    expect(anchor.isConnected).toBe(false)
    // Revoking in the same tick races the browser's own fetch of the blob URL.
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()
    vi.runAllTimers()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:x')
  })
})
