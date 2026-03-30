import { StatusChip } from "@/components/app/status-chip";
import { EmptyState } from "@/components/app/empty-state";

export type TimelineItem = {
  id: string;
  title: string;
  subtitle?: string;
  timestamp: Date;
  status?: string;
};

export function ActivityTimeline({ items }: { items: TimelineItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="No activity yet"
        message="Audit and signed action entries will appear here once your team starts using the platform."
      />
    );
  }

  return (
    <ol className="space-y-4">
      {items.map((item) => (
        <li key={item.id} className="relative pl-6">
          <span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full bg-slate-500" />
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">{item.title}</p>
              <p className="text-xs text-slate-500">{item.timestamp.toLocaleString()}</p>
            </div>
            {item.subtitle ? <p className="mt-1 text-sm text-slate-600">{item.subtitle}</p> : null}
            {item.status ? <StatusChip value={item.status} className="mt-2" /> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
