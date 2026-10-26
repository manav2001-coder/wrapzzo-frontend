import * as React from "react";

import { AsyncCombobox } from "@/components/fields/async-combobox";
import { Combobox } from "@/components/fields/combobox";
import { NumberInput } from "@/components/fields/number-input";
import { TextField } from "@/components/fields/text-field";
import { PasswordInput } from "@/components/ui/password-input";
import { ComponentDemo } from "@/pages/components-showcase/component-demo";
import {
  VENDORS,
  fetchRecipientPage,
  type DemoRecipient,
  type Vendor,
} from "@/pages/components-showcase/demo-data";

export function InputsSection() {
  const [giftName, setGiftName] = React.useState("");
  const [quantity, setQuantity] = React.useState<number | null>(50);
  const [vendor, setVendor] = React.useState<Vendor | null>(null);
  const [recipient, setRecipient] = React.useState<DemoRecipient | DemoRecipient[] | null>(null);

  return (
    <section id="inputs" className="space-y-4 scroll-mt-20">
      <h2 className="text-lg font-semibold tracking-tight">Inputs</h2>

      <ComponentDemo
        title="TextField"
        description="Input/Textarea wrapper with adornments and a loading state."
        code={`<TextField value={giftName} onChange={(e) => setGiftName(e.target.value)} placeholder="Engraved Steel Bottle" />`}
      >
        <TextField
          value={giftName}
          onChange={(e) => setGiftName(e.target.value)}
          placeholder="Engraved Steel Bottle"
          className="w-56"
        />
      </ComponentDemo>

      <ComponentDemo
        title="PasswordInput"
        description="A password field with a show/hide toggle. The toggle's accessible name comes from visually-hidden text, not `aria-label` - that would give getByLabelText(/password/i) a second match alongside the field itself."
        code={`<PasswordInput showLabel="Show password" hideLabel="Hide password" />`}
      >
        <div className="w-56">
          <PasswordInput
            showLabel="Show password"
            hideLabel="Hide password"
            placeholder="Password"
            defaultValue="hunter2"
          />
        </div>
      </ComponentDemo>

      <ComponentDemo
        title="NumberInput"
        description="Stepper input with min/max/step and Shift-multiplier."
        code={`<NumberInput value={quantity} onChange={setQuantity} min={1} max={500} step={1} />`}
      >
        <div className="w-48">
          <NumberInput value={quantity} onChange={setQuantity} min={1} max={500} step={1} />
        </div>
      </ComponentDemo>

      <ComponentDemo
        title="Combobox"
        description="Searchable single-select combobox over a bounded list."
        code={`<Combobox options={VENDORS} displayValue={(v) => v.name} value={vendor} onChange={setVendor} placeholder="Select vendor" />`}
      >
        <div className="w-56">
          <Combobox
            options={VENDORS}
            displayValue={(v) => v.name}
            value={vendor}
            onChange={(v) => setVendor(v as Vendor | null)}
            placeholder="Select vendor"
          />
        </div>
      </ComponentDemo>
      <ComponentDemo
        title="AsyncCombobox"
        description="Paginated combobox: fetches page 0 on open, pages in more on scroll, debounces typing. Selected rows stay ticked even when a search excludes them."
        code={`<AsyncCombobox
  queryKey={["recipients"]}
  fetchPage={fetchRecipientPage}
  displayValue={(r) => r.name}
  getOptionKey={(r) => r.id}
  renderOption={(r) => <span>{r.name} <em>{r.city}</em></span>}
  value={recipient}
  onChange={setRecipient}
  addNew={{ label: "Add a new recipient", onAdd: (q) => console.log(q) }}
/>`}
      >
        <div className="w-72">
          <AsyncCombobox<DemoRecipient>
            queryKey={["showcase", "recipients"]}
            fetchPage={fetchRecipientPage}
            displayValue={(option) => option.name}
            getOptionKey={(option) => option.id}
            renderOption={(option) => (
              <span className="flex w-full items-center justify-between gap-2">
                <span className="truncate">{option.name}</span>
                <span className="text-xs text-muted-foreground">{option.city}</span>
              </span>
            )}
            value={recipient}
            onChange={setRecipient}
            placeholder="Select a recipient (120 rows)"
            addNew={{ label: "Add a new recipient", onAdd: () => undefined }}
          />
        </div>
      </ComponentDemo>
    </section>
  );
}
