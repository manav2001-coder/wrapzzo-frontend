import type { Company } from '@/api/companies'

/** A company's logo, or its initial on a tinted tile when it has none. */
export function CompanyAvatar({ company, size = 32 }: { company: Pick<Company, 'name' | 'logoUrl'>; size?: number }) {
  return company.logoUrl ? (
    <img src={company.logoUrl} alt="" className="shrink-0 rounded-md border object-cover" style={{ width: size, height: size }} />
  ) : (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-md bg-primary/10 text-xs font-semibold text-primary"
      style={{ width: size, height: size }}
    >
      {company.name.charAt(0).toUpperCase()}
    </span>
  )
}
