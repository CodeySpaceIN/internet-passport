import { CircleSlash2 } from "lucide-react";

type EmptyStateProps = {
  title: string;
  message: string;
};

export function EmptyState({ title, message }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-card-border bg-background/60 p-6 text-center">
      <div className="mx-auto mb-3 inline-flex rounded-xl border border-card-border bg-card p-2.5">
        <CircleSlash2 className="h-4 w-4 text-muted" />
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted">{message}</p>
    </div>
  );
}
