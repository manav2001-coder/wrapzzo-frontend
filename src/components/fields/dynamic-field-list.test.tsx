import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";

import { renderWithProviders } from "@/test/test-utils";
import { DynamicFieldList } from "./dynamic-field-list";
import { TextField } from "./text-field";

interface FormValues {
  contacts: { phone: string }[];
}

function Harness({ compact, minRows = 1 }: { compact?: boolean; minRows?: number }) {
  const { control, register } = useForm<FormValues>({
    defaultValues: { contacts: [{ phone: "" }] },
  });

  return (
    <DynamicFieldList
      name="contacts"
      control={control}
      compact={compact}
      minRows={minRows}
      createEmptyRow={() => ({ phone: "" })}
      fieldConfigs={[
        {
          key: "phone",
          label: "Phone",
          render: (index) => <TextField {...register(`contacts.${index}.phone` as const)} />,
        },
      ]}
    />
  );
}

describe("DynamicFieldList", () => {
  it("appends a row when Add row is clicked", async () => {
    renderWithProviders(<Harness />);
    expect(screen.getAllByRole("textbox")).toHaveLength(1);

    await userEvent.click(screen.getByRole("button", { name: /add row/i }));
    expect(screen.getAllByRole("textbox")).toHaveLength(2);
  });

  it("removes a row when its delete button is clicked", async () => {
    renderWithProviders(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: /add row/i }));
    expect(screen.getAllByRole("textbox")).toHaveLength(2);

    const removeButtons = screen.getAllByRole("button", { name: /remove row/i });
    await userEvent.click(removeButtons[0]!);
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
  });

  it("hides the delete button at minRows", () => {
    renderWithProviders(<Harness minRows={1} />);
    expect(screen.queryByRole("button", { name: /remove row/i })).not.toBeInTheDocument();
  });

  it("renders without a Card wrapper in compact mode", () => {
    const { container } = renderWithProviders(<Harness compact />);
    expect(container.querySelector(".bg-card")).not.toBeInTheDocument();
  });
});
