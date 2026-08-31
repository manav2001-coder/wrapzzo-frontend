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
