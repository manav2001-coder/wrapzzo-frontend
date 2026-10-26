/** Save a Blob to the user's disk under `filename`. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  /*
   * Deferred, NOT called in this tick. `click()` only STARTS the download -- the browser fetches
   * the blob URL asynchronously -- so revoking immediately races that fetch and can produce a
   * truncated or 0-byte file (Chrome usually wins the race, Firefox often does not).
   */
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
