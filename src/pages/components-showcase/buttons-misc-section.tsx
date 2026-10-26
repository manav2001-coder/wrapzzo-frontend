import { Pencil, Plus, Trash2 } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dot } from "@/components/dot";
import { ButtonGroup } from "@/components/button-group";
import { Fab } from "@/components/fab";
import { IconButton } from "@/components/icon-button";
import { ComponentDemo } from "@/pages/components-showcase/component-demo";

export function ButtonsMiscSection() {
  return (
    <section id="buttons-misc" className="space-y-4 scroll-mt-20">
      <h2 className="text-lg font-semibold tracking-tight">Buttons &amp; Misc</h2>

      <ComponentDemo
        title="Button"
        description="Standard variants, plus a `loading` prop added directly to the primitive (spinner replaces children, forces disabled)."
        code={`<Button>Default</Button> <Button variant="secondary">Secondary</Button> <Button variant="destructive">Destructive</Button>
<Button variant="outline">Outline</Button> <Button variant="ghost">Ghost</Button> <Button variant="link">Link</Button>
<Button loading>Saving</Button>`}
      >
        <Button>Default</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="link">Link</Button>
        <Button loading>Saving</Button>
      </ComponentDemo>

      <ComponentDemo
        title="Badge / Chip variants"
        description="shadcn's Badge, with success and warning added for statuses."
        code={`<Badge>Default</Badge> <Badge variant="secondary">Secondary</Badge> <Badge variant="destructive">Destructive</Badge>
<Badge variant="outline">Outline</Badge> <Badge variant="success">Success</Badge> <Badge variant="warning">Warning</Badge>`}
      >
        <Badge>Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="destructive">Destructive</Badge>
        <Badge variant="outline">Outline</Badge>
        <Badge variant="success">Success</Badge>
        <Badge variant="warning">Warning</Badge>
      </ComponentDemo>

      <ComponentDemo
        title="Dot"
        description="Small status dot, filled or outlined, in every semantic color."
        code={`<Dot color="primary" /> <Dot color="success" /> <Dot color="warning" /> <Dot color="destructive" variant="outlined" />`}
      >
        <Dot color="primary" />
        <Dot color="success" />
        <Dot color="warning" />
        <Dot color="destructive" />
        <Dot color="destructive" variant="outlined" />
        <Dot color="muted" variant="outlined" />
      </ComponentDemo>

      <ComponentDemo
        title="Avatar sizes"
        description="No size-variant wrapper - just className, e.g. h-6 w-6 (xs) through h-12 w-12 (lg)."
        code={`<Avatar className="h-6 w-6"><AvatarFallback>AL</AvatarFallback></Avatar>
<Avatar className="h-9 w-9"><AvatarFallback>AL</AvatarFallback></Avatar>
<Avatar className="h-12 w-12"><AvatarFallback>AL</AvatarFallback></Avatar>`}
      >
        <Avatar className="h-6 w-6">
          <AvatarFallback className="text-[10px]">AL</AvatarFallback>
        </Avatar>
        <Avatar className="h-9 w-9">
          <AvatarFallback>AL</AvatarFallback>
        </Avatar>
        <Avatar className="h-12 w-12">
          <AvatarFallback>AL</AvatarFallback>
        </Avatar>
      </ComponentDemo>

      <ComponentDemo
        title="IconButton"
        description="Icon + tooltip + aria-label, always labelled. `tone` gives a tinted look; size and shape stay Button's job."
        code={`<IconButton icon={Trash2} label="Delete gift" tone="destructive" />
<IconButton icon={Plus} label="Add" tone="primary" tooltipSide="right" />
<IconButton icon={Pencil} label="Edit" tooltip={false} />`}
      >
        <IconButton icon={Plus} label="Add a gift" tone="primary" />
        <IconButton icon={Pencil} label="Edit gift" />
        <IconButton icon={Trash2} label="Delete gift" tone="destructive" />
        <IconButton icon={Plus} label="No tooltip" tooltip={false} />
      </ComponentDemo>

      <ComponentDemo
        title="Fab"
        description="Floating action button. A `none` position takes it out of the corner; `extended` shows the label inline and drops the (now redundant) tooltip."
        code={`<Fab icon={Plus} label="Send a gift" />
<Fab icon={Plus} label="Send a gift" extended position="none" />`}
      >
        <Fab icon={Plus} label="Send a gift" position="none" />
        <Fab icon={Plus} label="Send a gift" extended position="none" />
        <Fab icon={Plus} label="Small" size="sm" position="none" color="secondary" />
      </ComponentDemo>

      <ComponentDemo
        title="ButtonGroup"
        description="Joins adjacent ACTION buttons. No size/variant props - those would need cloneElement, which breaks asChild children. For a select-one control use SegmentedToggle instead."
        code={`<ButtonGroup label="Row actions">
  <Button variant="outline" size="sm">Edit</Button>
  <Button variant="outline" size="sm">Duplicate</Button>
  <Button variant="outline" size="sm">Archive</Button>
</ButtonGroup>`}
      >
        <div className="flex flex-col items-start gap-4">
          <ButtonGroup label="Row actions">
            <Button variant="outline" size="sm">
              Edit
            </Button>
            <Button variant="outline" size="sm">
              Duplicate
            </Button>
            <Button variant="outline" size="sm">
              Archive
            </Button>
          </ButtonGroup>
          <ButtonGroup orientation="vertical" label="Vertical actions">
            <Button variant="outline" size="sm">
              Up
            </Button>
            <Button variant="outline" size="sm">
              Down
            </Button>
          </ButtonGroup>
        </div>
      </ComponentDemo>

      <ComponentDemo
        title="Recipe: AnimateButton"
        description="No animation library: Tailwind already expresses hover/tap motion, and Button already owns `loading`."
        code={`// Hover/tap scale - Tailwind utilities instead of framer-motion
<Button className="transition-transform hover:scale-[1.02] active:scale-95">Animated</Button>`}
      >
        <Button className="transition-transform hover:scale-[1.02] active:scale-95">
          Animated
        </Button>
      </ComponentDemo>
    </section>
  );
}
