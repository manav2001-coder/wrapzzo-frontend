import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "./table";

describe("Table text layout", () => {
  it("keeps headings and body values on one line so every row is the same height", () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vehicle description</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>
              A long description that must wrap inside a table or a narrow popover
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    expect(screen.getByRole("columnheader")).toHaveClass(
      "whitespace-nowrap",
      "text-center",
      "font-semibold",
    );
    expect(screen.getByRole("cell")).toHaveClass("whitespace-nowrap", "text-ellipsis");
  });

  it("centres cells under the centred titles, except a cell that spans columns", () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Value</TableCell>
          </TableRow>
          <TableRow>
            <TableCell colSpan={3}>An expanded panel</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    const [plain, spanning] = screen.getAllByRole("cell");
    expect(plain).toHaveClass("text-center");
    expect(spanning).toHaveClass("text-left");
    expect(spanning).not.toHaveClass("text-center");
  });

  it("lets a cell opt back into wrapping with an explicit class", () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell className="whitespace-normal">Long free text</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    expect(screen.getByRole("cell")).toHaveClass("whitespace-normal");
    expect(screen.getByRole("cell")).not.toHaveClass("whitespace-nowrap");
  });

  it("allows explicit header wrapping for individual columns", () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="whitespace-normal">Description</TableHead>
          </TableRow>
        </TableHeader>
      </Table>,
    );
    expect(screen.getByRole("columnheader")).toHaveClass("whitespace-normal");
    expect(screen.getByRole("columnheader")).not.toHaveClass("whitespace-nowrap");
  });

  it("lets a cell that spans columns wrap and never clip, since it holds free-form content", () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell colSpan={3}>An expanded panel</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    expect(screen.getByRole("table")).toHaveClass(
      "[&_td[colspan]]:whitespace-normal",
      "[&_td[colspan]]:overflow-visible",
    );
  });

  it("wrapCells opts a whole detail table back into wrapping", () => {
    render(
      <Table wrapCells>
        <TableBody>
          <TableRow>
            <TableCell>Tall cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    expect(screen.getByRole("table")).toHaveClass(
      "[&_td]:whitespace-normal",
      "[&_td]:overflow-visible",
    );
  });
});
