import { ButtonsMiscSection } from "@/pages/components-showcase/buttons-misc-section";
import { CardsSection } from "@/pages/components-showcase/cards-section";
import { FormsSection } from "@/pages/components-showcase/forms-section";
import { InputsSection } from "@/pages/components-showcase/inputs-section";
import { LayoutSection } from "@/pages/components-showcase/layout-section";
import { NavigationSection } from "@/pages/components-showcase/navigation-section";
import { OverlaysSection } from "@/pages/components-showcase/overlays-section";
import { PickersSection } from "@/pages/components-showcase/pickers-section";
import { SectionNav } from "@/pages/components-showcase/section-nav";
import { SelectionControlsSection } from "@/pages/components-showcase/selection-controls-section";
import { TablesSection } from "@/pages/components-showcase/tables-section";

/**
 * Component-kit showcase — a living style guide listing every shared UI component with dummy
 * data and a "view code" snippet, so the team can browse and copy usage without hunting through
 * source files. Every kit component has a demo here; changing one means updating its section
 * (`Components.test.tsx` matches each `<h2>` to `section-nav.tsx`).
 */
export default function ComponentsPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Components</h1>
        <p className="text-muted-foreground">
          A living gallery of the app's shared UI components, with dummy data and copyable code.
        </p>
      </header>

      <div className="flex gap-8">
        <SectionNav />
        <div className="min-w-0 flex-1 space-y-10">
          <InputsSection />
          <PickersSection />
          <SelectionControlsSection />
          <FormsSection />
          <TablesSection />
          <OverlaysSection />
          <CardsSection />
          <NavigationSection />
          <LayoutSection />
          <ButtonsMiscSection />
        </div>
      </div>
    </div>
  );
}
