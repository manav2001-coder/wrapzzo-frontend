/** How a doctor is named wherever a person reads it: the name, then the pcode in brackets -- "Dr. Asha Shah (P-1001)". No pcode, no brackets. */
export function doctorLabel(name: string | null | undefined, pcode: string | null | undefined): string {
  const n = name?.trim() ?? ''
  const p = pcode?.trim() ?? ''
  if (n && p) return `${n} (${p})`
  if (p) return `(${p})`
  return n
}
