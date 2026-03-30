import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export function AdminTableCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      <div className="mt-4 overflow-x-auto">{children}</div>
    </Card>
  );
}
