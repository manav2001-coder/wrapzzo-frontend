import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { uploadQuickGiftPhoto } from './quickGifts'

const post = vi.hoisted(() => vi.fn())
vi.mock('@/lib/axiosClient', () => ({ apiClient: { post } }))

describe('uploadQuickGiftPhoto', () => {
  beforeEach(() => {
    post.mockReset().mockResolvedValue({
      data: { uploadUrl: 'https://store.test/put', key: 'quick-gifts/c/u/x/MH-1_AM1_photo.png', fileName: 'MH-1_AM1_photo.png' },
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }))
  })
  afterEach(() => vi.unstubAllGlobals())

  it("sends the doctor's pcode so the server can name the file, and submits the server's name -- not the file's own", async () => {
    const file = new File(['x'], 'IMG_2231.png', { type: 'image/png' })

    const value = await uploadQuickGiftPhoto(file, 'MH-1')

    expect(post).toHaveBeenCalledWith('/api/quick-gifts/presignPhoto', { contentType: 'image/png', pcode: 'MH-1' })
    expect(value).toEqual({ key: 'quick-gifts/c/u/x/MH-1_AM1_photo.png', fileName: 'MH-1_AM1_photo.png', contentType: 'image/png' })
  })
})
