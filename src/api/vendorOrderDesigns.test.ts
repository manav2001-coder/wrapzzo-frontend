import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/lib/axiosClient'
import { uploadVendorOrderDesign } from './vendorOrderDesigns'

const post = vi.hoisted(() => vi.fn())
vi.mock('@/lib/vendorApiClient', () => ({ vendorApiClient: { post, get: vi.fn() } }))

describe('uploadVendorOrderDesign', () => {
  beforeEach(() => {
    post.mockReset()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }))
  })

  it('refuses anything that is not a PDF, before asking for an upload URL', async () => {
    await expect(uploadVendorOrderDesign('o-1', new File(['x'], 'logo.png', { type: 'image/png' }))).rejects.toThrow('"logo.png" is not a PDF. Proofs must be PDF files.')
    expect(post).not.toHaveBeenCalled()
  })

  it("sends the file's name for the server to check, stores the PDF under the server's name and registers it by key alone", async () => {
    post
      .mockResolvedValueOnce({ data: { uploadUrl: 'https://storage.test/put', key: 'order-designs/o-1/u/P-1001_AM-PATNA_v1.pdf', fileName: 'P-1001_AM-PATNA_v1.pdf' } })
      .mockResolvedValueOnce({ data: { id: 'd-1', fileName: 'P-1001_AM-PATNA_v1.pdf' } })

    await uploadVendorOrderDesign('o-1', new File(['%PDF'], 'P-1001_Asha-Shah_Patna-AM.pdf', { type: 'application/pdf' }))

    expect(post).toHaveBeenNthCalledWith(1, '/api/vendor/orders/o-1/designs/presign', { contentType: 'application/pdf', fileName: 'P-1001_Asha-Shah_Patna-AM.pdf' })
    expect(fetch).toHaveBeenCalledWith('https://storage.test/put', expect.objectContaining({ method: 'PUT', headers: { 'Content-Type': 'application/pdf' } }))
    expect(post).toHaveBeenNthCalledWith(2, '/api/vendor/orders/o-1/designs', { key: 'order-designs/o-1/u/P-1001_AM-PATNA_v1.pdf' })
  })

  it('accepts a .pdf the system reports no type for, and still sends it as a PDF', async () => {
    post
      .mockResolvedValueOnce({ data: { uploadUrl: 'https://storage.test/put', key: 'k/P_A_v1.pdf', fileName: 'P_A_v1.pdf' } })
      .mockResolvedValueOnce({ data: { id: 'd-1' } })
    await uploadVendorOrderDesign('o-1', new File(['%PDF'], 'proof.PDF', { type: '' }))
    expect(post).toHaveBeenNthCalledWith(1, '/api/vendor/orders/o-1/designs/presign', { contentType: 'application/pdf', fileName: 'proof.PDF' })
  })

  it('uploads nothing when the server refuses the file name, and passes its explanation on', async () => {
    const refusal = new ApiError('"final.pdf" is not named the way this order needs. Name the proof PCode_DoctorName_AMName.pdf -- for this order: P-1001_Asha-Shah_Patna-AM.pdf', 400)
    post.mockRejectedValueOnce(refusal)

    await expect(uploadVendorOrderDesign('o-1', new File(['%PDF'], 'final.pdf', { type: 'application/pdf' }))).rejects.toBe(refusal)
    expect(fetch).not.toHaveBeenCalled()
    expect(post).toHaveBeenCalledTimes(1)
  })

  it('says why when file storage refuses the file, or cannot be reached', async () => {
    post.mockResolvedValue({ data: { uploadUrl: 'https://storage.test/put', key: 'k/P_A_v1.pdf', fileName: 'P_A_v1.pdf' } })
    const pdf = new File(['%PDF'], 'proof.pdf', { type: 'application/pdf' })

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }))
    await expect(uploadVendorOrderDesign('o-1', pdf)).rejects.toThrow('File storage refused "proof.pdf" (status 403)')

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(uploadVendorOrderDesign('o-1', pdf)).rejects.toThrow('could not be sent to file storage')
  })
})
