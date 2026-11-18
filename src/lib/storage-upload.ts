import { UserFacingError } from '@/lib/user-facing-error'

/**
 * Where photos and proofs are stored: Cloudflare R2, on an address of its own. Some phone networks and office firewalls let the
 * app load but block that address, so the upload died with the browser's bare "Failed to fetch". The app's own host forwards
 * `/storage/` to it (nginx), and the upload goes there instead, so anyone who can open the app can upload.
 */
const STORAGE_HOST = /\.r2\.cloudflarestorage\.com$/i

/**
 * The same signed URL, on the app's own address. The signature covers the path and query, which stay exactly as the server
 * made them; the proxy puts the storage host back. A URL for any other host (a local dev store) is left alone.
 */
export function sameOriginStorageUrl(uploadUrl: string, origin: string = window.location.origin): string {
  let url: URL
  try {
    url = new URL(uploadUrl)
  } catch {
    return uploadUrl
  }
  if (!STORAGE_HOST.test(url.hostname)) return uploadUrl
  return `${origin}/storage${url.pathname}${url.search}`
}

/**
 * PUTs a file to a signed storage URL. `what` is how the person knows the file ("photo", "logo.png"), so a failure says
 * which file and what to do, instead of the browser's own wording.
 */
export async function putToStorage(uploadUrl: string, body: Blob, contentType: string, what: string): Promise<void> {
  let response: Response
  try {
    response = await fetch(sameOriginStorageUrl(uploadUrl), { method: 'PUT', headers: { 'Content-Type': contentType }, body })
  } catch {
    throw new UserFacingError(`The ${what} could not be uploaded -- the connection dropped before it reached file storage. Check your internet and try again.`)
  }
  if (!response.ok) {
    throw new UserFacingError(`File storage refused the ${what} (status ${response.status}). Please try again, and tell us if it keeps happening.`)
  }
}
