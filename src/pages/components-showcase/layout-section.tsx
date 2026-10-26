import * as React from "react";
import { Gift, Plus } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { LoadingBar } from "@/components/loading-bar";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { ComponentDemo } from "@/pages/components-showcase/component-demo";

export function LayoutSection() {
  const [loading, setLoading] = React.useState(false);

  return (
    <section id="layout" className="space-y-4 scroll-mt-20">
      <h2 className="text-lg font-semibold tracking-tight">Layout</h2>

      <ComponentDemo
        title="SectionCard"
        description="The titled section container. Header slot, optional divider, footer, loading skeleton, and border/elevation/padding switches."
        code={`<SectionCard
  title="Gift details"
  description="Pricing and vendor"
  actions={<Button size="sm" variant="outline">Edit</Button>}
  footer={<span>Last updated 21 Oct 2026</span>}
>
  GID-204 · Engraved Steel Bottle · PrintHouse Mumbai
</SectionCard>`}
      >
        <div className="w-full space-y-4">
          <SectionCard
            title="Gift details"
            description="Pricing and vendor"
            actions={
              <Button size="sm" variant="outline">
                Edit
              </Button>
            }
            footer={
              <span className="text-xs text-muted-foreground">Last updated 21 Oct 2026</span>
            }
          >
            GID-204 · Engraved Steel Bottle · PrintHouse Mumbai
          </SectionCard>

          <div className="grid gap-4 sm:grid-cols-2">
            <SectionCard title="Elevated" elevated>
              Casts a shadow.
            </SectionCard>
            <SectionCard title="Borderless" border={false}>
              No outline.
            </SectionCard>
            <SectionCard title="Loading" loading>
              Never seen.
            </SectionCard>
            <SectionCard title="No divider" divider={false}>
              Header runs straight into the body.
            </SectionCard>
          </div>
        </div>
      </ComponentDemo>

      <ComponentDemo
        title="LoadingBar"
        description="Indeterminate top-of-page progress. Reports no aria-valuenow - the duration is genuinely unknown."
        code={`<LoadingBar position="inline" />`}
      >
        <div className="w-full space-y-3">
          <div className="relative overflow-hidden rounded-md border border-border">
            <LoadingBar position="inline" active={loading} />
            <div className="p-4 text-sm text-muted-foreground">{loading ? "Loading…" : "Idle"}</div>
          </div>
          <Button size="sm" variant="outline" onClick={() => setLoading((prev) => !prev)}>
            Toggle
          </Button>
        </div>
      </ComponentDemo>

      <ComponentDemo
        title="EmptyState"
        description="The 'nothing here yet' panel for a page or card."
        code={`<EmptyState
  icon={Gift}
  title="No gifts yet"
  description="Add your first gift to the catalogue."
  action={{ label: "Add a gift", icon: Plus, onClick: create }}
  secondaryAction={{ label: "Import sheet", onClick: importSheet }}
/>`}
      >
        <div className="w-full space-y-4">
          <EmptyState
            icon={Gift}
            title="No gifts yet"
            description="Add your first gift to the catalogue."
            action={{ label: "Add a gift", icon: Plus, onClick: () => undefined }}
            secondaryAction={{ label: "Import sheet", onClick: () => undefined }}
          />
          <SectionCard title="Inside a card" contentClassName="pt-0">
            <EmptyState variant="plain" size="sm" title="Nothing to show" />
          </SectionCard>
        </div>
      </ComponentDemo>

      <ComponentDemo
        title="ScrollTop"
        description="Scrolls to the top on every navigation. Renders nothing, so there is no live demo - it is mounted in AppLayout and pointed at the scrolling <main>, because that (not the window) is this app's scroll container."
        code={`const mainRef = React.useRef<HTMLElement>(null);
// …
<ScrollTop targetRef={mainRef} />
<main ref={mainRef} className="flex-1 overflow-auto">…</main>`}
      >
        <p className="text-sm text-muted-foreground">Side-effect only - nothing renders.</p>
      </ComponentDemo>
    </section>
  );
}
