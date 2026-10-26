import * as React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export interface ComponentDemoProps {
  title: string;
  description?: string;
  code: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Every showcase section is built from these: a live demo plus a hand-maintained
 * "View code" snippet (not auto-extracted from `children` — can drift if a demo is
 * edited without updating its string; acceptable v1 tradeoff, kept immediately next
 * to the demo JSX to minimize that risk).
 */
export function ComponentDemo({
  title,
  description,
  code,
  children,
  className,
}: ComponentDemoProps) {
  const [showCode, setShowCode] = React.useState(false);

  return (
    // `frame-free`: a demo table is content of this long page, not the page (see index.css).
    <Card className={cn("frame-free", className)}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-4">{children}</div>
        <Button variant="ghost" size="sm" onClick={() => setShowCode((v) => !v)} className="gap-1">
          {showCode ? "Hide code" : "View code"}
          {showCode ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </Button>
        {showCode && (
          <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
            <code>{code}</code>
          </pre>
        )}
      </CardContent>
    </Card>
  );
}
