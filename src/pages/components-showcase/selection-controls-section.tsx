import * as React from "react";

import { CheckboxField } from "@/components/fields/checkbox-field";
import { RadioGroupField } from "@/components/fields/radio-group-field";
import { SegmentedToggle } from "@/components/fields/segmented-toggle";
import { SwitchField } from "@/components/fields/switch-field";
import { ComponentDemo } from "@/pages/components-showcase/component-demo";

export function SelectionControlsSection() {
  const [giftWrap, setGiftWrap] = React.useState(true);
  const [purpose, setPurpose] = React.useState("festival");
  const [photoRequired, setPhotoRequired] = React.useState(false);
  const [view, setView] = React.useState(true);

  return (
    <section id="selection-controls" className="space-y-4 scroll-mt-20">
      <h2 className="text-lg font-semibold tracking-tight">Selection Controls</h2>

      <ComponentDemo
        title="CheckboxField"
        description="Label + helper/error text, supports indeterminate."
        code={`<CheckboxField label="Gift wrap" checked={giftWrap} onCheckedChange={setGiftWrap} />`}
      >
        <CheckboxField label="Gift wrap" checked={giftWrap} onCheckedChange={setGiftWrap} />
      </ComponentDemo>

      <ComponentDemo
        title="RadioGroupField"
        description="Campaign purpose selector."
        code={`<RadioGroupField name="purpose" label="Purpose" value={purpose} onValueChange={setPurpose} options={[...]} row />`}
      >
        <RadioGroupField
          name="purpose"
          label="Purpose"
          value={purpose}
          onValueChange={setPurpose}
          row
          options={[
            { value: "festival", label: "Festival" },
            { value: "product-launch", label: "Product launch" },
            { value: "hcp-engagement", label: "HCP engagement" },
          ]}
        />
      </ComponentDemo>

      <ComponentDemo
        title="SwitchField"
        description="One switch component for every on/off setting."
        code={`<SwitchField label="Recipient photo required" checked={photoRequired} onCheckedChange={setPhotoRequired} />`}
      >
        <SwitchField
          label="Recipient photo required"
          checked={photoRequired}
          onCheckedChange={setPhotoRequired}
        />
      </ComponentDemo>

      <ComponentDemo
        title="SegmentedToggle"
        description="Boolean Yes/No control, here repurposed as a List/Map view switch."
        code={`<SegmentedToggle value={view} onChange={setView} trueLabel="List" falseLabel="Map" />`}
      >
        <SegmentedToggle value={view} onChange={setView} trueLabel="List" falseLabel="Map" />
      </ComponentDemo>
    </section>
  );
}
