/** A proof is at most this big -- the server enforces the same limit on what is stored. */
export const MAX_PROOF_BYTES = 5 * 1024 * 1024

export function proofTooBigMessage(fileName: string, bytes: number): string {
  return `"${fileName}" is ${(bytes / (1024 * 1024)).toFixed(1)} MB. A proof can be at most 5 MB -- compress the PDF or export it at a lower quality, then choose it again.`
}

export function notAPdfMessage(fileName: string): string {
  return `"${fileName}" is not a PDF. Proofs must be PDF files.`
}
