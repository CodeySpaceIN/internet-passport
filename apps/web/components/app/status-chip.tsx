import { cn } from "@/lib/utils";

type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

function inferTone(value: string): StatusTone {
  const v = value.toUpperCase();
  if (["PASSED", "APPROVED", "SUCCESS", "ACTIVE", "VERIFIED", "ALLOW"].includes(v)) return "success";
  if (["PENDING", "IN_PROGRESS", "NEEDS_REVIEW", "REVIEW", "MEDIUM"].includes(v)) return "warning";
  if (["FAILED", "REJECTED", "CRITICAL", "DENY", "REVOKED", "DISABLED"].includes(v)) return "danger";
  if (["INFO", "LOW", "CLIENT_ERROR", "SERVER_ERROR", "RATE_LIMITED"].includes(v)) return "info";
  return "neutral";
}

const toneClasses: Record<StatusTone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/35 dark:text-emerald-300",
  warning: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/35 dark:text-amber-300",
  danger: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/35 dark:text-rose-300",
  info: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/35 dark:text-sky-300",
  neutral: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300",
};

export function StatusChip({ value, className }: { value: string; className?: string }) {
  const tone = inferTone(value);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.08em]",
        toneClasses[tone],
        className,
      )}
    >
      {value.replaceAll("_", " ")}
    </span>
  );
}
