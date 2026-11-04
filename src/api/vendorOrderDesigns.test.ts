import { beforeEach, describe, expect, it, vi } from 'vitest'

import { uploadVendorOrderDesign } from './vendorOrderDesigns'

const post = vi.hoisted(() => vi.fn())
vi.mock('@/lib/vendorApiClient', () => ({ vendorApiClient: { post, get: vi.fn() } }))

describe('uploadVendorOrderDesign', () => {
  beforeEach(() => {
    post.mockReset()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }))
  })

  it('refuses anything that is not a PDF, before asking for an upload URL', async () => {
    await expect(uploadVendorOrderDesign('o-1', new File(['x'], 'logo.png', { type: 'image/png' }))).rejects.toThrow('Only PDF files can be uploaded.')
    expect(post).not.toHaveBeenCalled()
  })

  it("stores the PDF under the server's name and registers it by key alone -- the file's own name is not sent", async () => {
    post
      .mockResolvedValueOnce({ data: { uploadUrl: 'https://storage.test/put', key: 'order-designs/o-1/u/P-1001_AM-PATNA_v1.pdf', fileName: 'P-1001_AM-PATNA_v1.pdf' } })
      .mockResolvedValueOnce({ data: { id: 'd-1', fileName: 'P-1001_AM-PATNA_v1.pdf' } })

    await uploadVendorOrderDesign('o-1', new File(['%PDF'], 'whatever-the-vendor-called-it.pdf', { type: 'application/pdf' }))

    expect(post).toHaveBeenNthCalledWith(1, '/api/vendor/orders/o-1/designs/presign', { contentType: 'application/pdf' })
    expect(fetch).toHaveBeenCalledWith('https://storage.test/put', expect.objectContaining({ method: 'PUT', headers: { 'Content-Type': 'application/pdf' } }))
    expect(post).toHaveBeenNthCalledWith(2, '/api/vendor/orders/o-1/designs', { key: 'order-designs/o-1/u/P-1001_AM-PATNA_v1.pdf' })
  })
})
