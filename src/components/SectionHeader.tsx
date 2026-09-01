/** A small uppercase eyebrow + title, used to give each dashboard section its own identity instead of a flat stack of same-weight cards. */
export function SectionHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-3 flex items-baseline gap-2.5">
      <span className="h-3 w-1 shrink-0 rounded-full bg-accent" />
      <div>
        <p className="text-[11px] font-semibold tracking-wider text-accent uppercase">{eyebrow}</p>
        <h2 className="text-base font-semibold text-text">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-text-muted">{subtitle}</p>}
      </div>
    </div>
  )
}
