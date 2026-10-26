export interface SectionNavItem {
  id: string;
  label: string;
}

export const SECTIONS: SectionNavItem[] = [
  { id: "inputs", label: "Inputs" },
  { id: "pickers", label: "Pickers" },
  { id: "selection-controls", label: "Selection Controls" },
  { id: "forms", label: "Forms" },
  { id: "tables", label: "Tables" },
  { id: "overlays", label: "Overlays" },
  { id: "cards", label: "Cards" },
  { id: "navigation", label: "Navigation" },
  { id: "layout", label: "Layout" },
  { id: "buttons-misc", label: "Buttons & Misc" },
];

/** Sticky in-page anchor list — deep-linkable (#tables), unlike a Tabs-per-category layout. */
export function SectionNav() {
  return (
    <nav className="sticky top-20 hidden w-44 shrink-0 space-y-1 self-start lg:block">
      {SECTIONS.map((section) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          className="block rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {section.label}
        </a>
      ))}
    </nav>
  );
}
