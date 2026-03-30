import { Card } from "@/components/ui/card";

export function AdminMetricCard({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string | number;
  tone?: "slate" | "amber" | "emerald" | "rose";
}) {
  const toneClass =
    tone === "amber"
      ? "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/35"
      : tone === "emerald"
        ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/35"
        : tone === "rose"
          ? "border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/35"
          : "border-card-border bg-card";
  return (
    <Card className={`border ${toneClass}`}>
      <p className="text-xs uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
    </Card>
  );
}
