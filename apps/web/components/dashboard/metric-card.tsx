import { Card } from "@/components/ui/card";

type MetricCardProps = {
  title: string;
  value: string;
  delta?: string;
  footer?: string;
};

export function MetricCard({ title, value, delta, footer }: MetricCardProps) {
  return (
    <Card className="min-h-[132px] p-5">
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted">{title}</p>
      <p className="mt-3 text-4xl font-semibold leading-none tracking-tight text-foreground">{value}</p>
      {delta ? (
        <p className="mt-2 inline-flex w-fit rounded-full bg-emerald-100/70 px-2 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/35 dark:text-emerald-300">
          {delta}
        </p>
      ) : null}
      {footer ? <p className="mt-3 text-xs text-muted">{footer}</p> : null}
    </Card>
  );
}
