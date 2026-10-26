import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";

export interface MultiValuePopoverCellProps {
  values?: string[];
  renderTable?: { label: string; quantity: number }[];
  title?: string;
}

/** Generic "N values -> button that opens a popover" table-cell renderer. */
export function MultiValuePopoverCell({ values, renderTable, title }: MultiValuePopoverCellProps) {
  const items = renderTable ?? values ?? [];
  if (items.length === 0) return <span className="text-muted-foreground">-</span>;
  if (items.length === 1) return <span>{renderTable ? renderTable[0]!.label : values![0]}</span>;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          {title ?? `${items.length} items`}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        {renderTable ? (
          <Table>
            <TableBody>
              {renderTable.map((row) => (
                <TableRow key={row.label}>
                  <TableCell>{row.label}</TableCell>
                  <TableCell className="text-right">{row.quantity}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <ul className="space-y-1 text-sm">
            {values!.map((value, index) => (
              <li key={index}>{value}</li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
