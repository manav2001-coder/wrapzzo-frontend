import { useForm } from "react-hook-form";
import { z } from "zod";

import { DynamicFieldList } from "@/components/fields/dynamic-field-list";
import {
  FormGenerator,
  type FieldConfig,
  type StepConfig,
} from "@/components/fields/form-generator";
import { Stepper } from "@/components/fields/stepper";
import { SwitchField } from "@/components/fields/switch-field";
import { TextField } from "@/components/fields/text-field";
import { ComponentDemo } from "@/pages/components-showcase/component-demo";

interface ContactsForm {
  contacts: { phone: string }[];
}

function DynamicFieldListDemo() {
  const { control, register } = useForm<ContactsForm>({
    defaultValues: { contacts: [{ phone: "" }] },
  });

  return (
    <DynamicFieldList
      name="contacts"
      control={control}
      createEmptyRow={() => ({ phone: "" })}
      fieldConfigs={[
        {
          key: "phone",
          label: "Phone",
          render: (index) => (
            <TextField {...register(`contacts.${index}.phone` as const)} placeholder="+91…" />
          ),
        },
      ]}
    />
  );
}

const ADD_RECIPIENT_FIELDS: FieldConfig[] = [
  {
    id: "name",
    label: "Name",
    required: true,
    zodSchema: z.string().min(1, "Name is required"),
    render: ({ value, onChange }) => (
      <TextField value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
    ),
  },
  {
    id: "phone",
    label: "Phone",
    required: true,
    zodSchema: z.string().min(1, "Phone is required"),
    render: ({ value, onChange }) => (
      <TextField value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
    ),
  },
];

const ADD_GIFT_STEPS: StepConfig[] = [
  {
    label: "Details",
    fields: [
      {
        id: "giftName",
        label: "Gift name",
        required: true,
        zodSchema: z.string().min(1, "Required"),
        render: ({ value, onChange }) => (
          <TextField value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
        ),
      },
    ],
  },
  {
    label: "Personalisation",
    fields: [
      {
        id: "photoRequired",
        label: "Needs a recipient photo",
        fieldKind: "boolean",
        zodSchema: z.boolean(),
        render: ({ value, onChange }) => (
          <SwitchField checked={Boolean(value)} onCheckedChange={onChange} />
        ),
      },
    ],
  },
  {
    label: "Review",
    fields: [
      {
        id: "notes",
        label: "Notes",
        render: ({ value, onChange }) => (
          <TextField
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            multiline
          />
        ),
      },
    ],
  },
];

export function FormsSection() {
  return (
    <section id="forms" className="space-y-4 scroll-mt-20">
      <h2 className="text-lg font-semibold tracking-tight">Forms</h2>

      <ComponentDemo
        title="Stepper"
        description="Standalone step-progress indicator, also used inside FormGenerator's stepper mode."
        code={`<Stepper steps={["Details", "Personalisation", "Review"]} activeStep={1} />`}
      >
        {/* Full width, as inside a form: the connectors are flex-1 and collapse in a content-sized row. */}
        <Stepper
          steps={["Details", "Personalisation", "Review"]}
          activeStep={1}
          className="mb-9 w-full max-w-md"
        />
      </ComponentDemo>

      <ComponentDemo
        title="DynamicFieldList"
        description="Repeatable field array on react-hook-form's useFieldArray."
        code={`<DynamicFieldList name="contacts" control={control} createEmptyRow={...} fieldConfigs={[{ key: "phone", label: "Phone", render: (i) => <TextField {...register(\`contacts.\${i}.phone\`)} /> }]} />`}
      >
        <DynamicFieldListDemo />
      </ComponentDemo>

      <ComponentDemo
        title="FormGenerator - flat mode"
        description="Schema-driven form assembled from a zod schema per field."
        code={`<FormGenerator fields={ADD_RECIPIENT_FIELDS} maxWidgetsPerRow={2} onSubmit={handleSubmit} />`}
        className="max-w-xl"
      >
        <FormGenerator
          fields={ADD_RECIPIENT_FIELDS}
          maxWidgetsPerRow={2}
          onSubmit={() => {}}
          hideCardWrapper
        />
      </ComponentDemo>

      <ComponentDemo
        title="FormGenerator - stepper mode"
        description="3-step Add Gift wizard; Continue is gated on the current step's validation."
        code={`<FormGenerator steps={ADD_GIFT_STEPS} maxWidgetsPerRow={1} onSubmit={handleSubmit} />`}
        className="max-w-xl"
      >
        <FormGenerator
          steps={ADD_GIFT_STEPS}
          maxWidgetsPerRow={1}
          onSubmit={() => {}}
          hideCardWrapper
        />
      </ComponentDemo>

      <ComponentDemo
        title="FormGenerator - section mode"
        description='The same steps as the sections of one record (stepMode="sections"): each is headed by its label, and the circles jump to any section.'
        code={`<FormGenerator steps={ADD_GIFT_STEPS} stepMode="sections" maxWidgetsPerRow={1} onSubmit={handleSubmit} />`}
        className="max-w-xl"
      >
        <FormGenerator
          steps={ADD_GIFT_STEPS}
          stepMode="sections"
          maxWidgetsPerRow={1}
          onSubmit={() => {}}
          hideCardWrapper
        />
      </ComponentDemo>
    </section>
  );
}
