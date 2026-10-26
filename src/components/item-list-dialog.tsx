import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface ItemListDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  items: string[];
}

/** Fully generic "show a list of strings in a modal" pattern. */
export function ItemListDialog({ open, onClose, title, items }: ItemListDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-72">
          <ul className="space-y-1 text-sm">
            {items.map((item, index) => (
              <li key={index} className="rounded-md px-2 py-1 odd:bg-muted/40">
                {item}
              </li>
            ))}
          </ul>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
