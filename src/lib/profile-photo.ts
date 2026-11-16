/** Profile pictures are cropped to a square and shrunk here, on the phone, so what is uploaded is small whatever the camera took. */
export const PHOTO_SIZE = 400
export const PHOTO_ACCEPT = 'image/jpeg,image/png'
const MAX_INPUT_BYTES = 15 * 1024 * 1024

/** The centred square of a picture: where it starts and how long its side is. */
export function squareCrop(width: number, height: number): { sx: number; sy: number; side: number } {
  const side = Math.min(width, height)
  return { sx: Math.round((width - side) / 2), sy: Math.round((height - side) / 2), side }
}

/** Why a chosen file cannot be used, or null when it can. */
export function photoProblem(file: { type: string; size: number }): 'type' | 'size' | null {
  if (file.type !== 'image/jpeg' && file.type !== 'image/png') return 'type'
  if (file.size > MAX_INPUT_BYTES) return 'size'
  return null
}

/** The chosen picture as a 400 x 400 JPEG, cropped from the middle. */
export async function prepareProfilePhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  try {
    const { sx, sy, side } = squareCrop(bitmap.width, bitmap.height)
    const canvas = document.createElement('canvas')
    canvas.width = PHOTO_SIZE
    canvas.height = PHOTO_SIZE
    const context = canvas.getContext('2d')
    if (!context) throw new Error('canvas unavailable')
    // A PNG may be see-through, which a JPEG cannot be: it goes onto white.
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, PHOTO_SIZE, PHOTO_SIZE)
    context.drawImage(bitmap, sx, sy, side, side, 0, 0, PHOTO_SIZE, PHOTO_SIZE)
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('encode failed'))), 'image/jpeg', 0.86))
  } finally {
    bitmap.close()
  }
}
