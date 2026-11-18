import { afterEach, describe, expect, it, vi } from 'vitest'

import { putToStorage, sameOriginStorageUrl } from '@/lib/storage-upload'
import { UserFacingError } from '@/lib/user-facing-error'

const R2 = 'https://abc123.r2.cloudflarestorage.com/wrappzo-assets/quick-gifts/p/1.jpg?X-Amz-Signature=s1g&X-Amz-Expires=300'

describe('sameOriginStorageUrl', () => {
  it('moves a storage URL onto the app address, keeping the signed path and query exactly', () => {
    expect(sameOriginStorageUrl(R2, 'https://workspace.wrappzo.com')).toBe(
      'https://workspace.wrappzo.com/storage/wrappzo-assets/quick-gifts/p/1.jpg?X-Amz-Signature=s1g&X-Amz-Expires=300',
    )
  })

  it('leaves a URL for any other host (a local dev store) alone', () => {
    expect(sameOriginStorageUrl('http://localhost:9000/bucket/k?sig=1', 'https://workspace.wrappzo.com')).toBe('http://localhost:9000/bucket/k?sig=1')
  })

  it('leaves something that is not a URL alone', () => {
    expect(sameOriginStorageUrl('not a url', 'https://x')).toBe('not a url')
  })
})

describe('putToStorage', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('PUTs the file to the app-address URL with its content type', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    const body = new Blob(['x'], { type: 'image/jpeg' })
    await putToStorage(R2, body, 'image/jpeg', 'photo')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${window.location.origin}/storage/wrappzo-assets/quick-gifts/p/1.jpg?X-Amz-Signature=s1g&X-Amz-Expires=300`)
    expect(init).toMatchObject({ method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body })
  })

  it('says which file and what to do when the connection drops, not "Failed to fetch"', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    const error = await putToStorage(R2, new Blob(['x']), 'image/jpeg', 'photo').catch((e) => e)
    expect(error).toBeInstanceOf(UserFacingError)
    expect(error.message).toContain('The photo could not be uploaded')
    expect(error.message).not.toContain('Failed to fetch')
  })

  it('says storage refused the file, with the status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }))
    await expect(putToStorage(R2, new Blob(['x']), 'image/jpeg', 'photo')).rejects.toThrow('File storage refused the photo (status 403)')
  })
})
