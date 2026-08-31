/** "PRODUCT_LAUNCH" -> "Product Launch" -- for rendering backend enum values in the UI. */
export function humanize(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const currencyFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 })

/** 1234.5 -> "₹1,234.50". Returns "—" for null/undefined -- callers don't need their own guard. */
export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '—'
  return currencyFormatter.format(value)
}

/**
 * Parses a plain "yyyy-MM-dd" (no time/zone) into a Date at local midnight on that calendar
 * day -- `new Date("2026-09-09")` instead parses as UTC midnight, which renders as the
 * *previous* day for anyone west of UTC. Use this for any date-only value (date of birth,
 * a DATE-type field) headed into a Calendar or date-fns `format`.
 */
export function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}
