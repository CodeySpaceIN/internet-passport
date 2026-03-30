import { StatusChip } from "@/components/app/status-chip";

type AuditLogRow = {
  id: string;
  actionType: string;
  actorLabel: string;
  targetType: string;
  targetId: string | null;
  outcome: string;
  timestamp: Date;
  metadataPreview?: string;
};

export function AuditLogTable({ rows }: { rows: AuditLogRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-card-border text-muted">
            <th className="px-2 py-2">Action</th>
            <th className="px-2 py-2">Actor</th>
            <th className="px-2 py-2">Target</th>
            <th className="px-2 py-2">Outcome</th>
            <th className="px-2 py-2">Metadata</th>
            <th className="px-2 py-2">Time</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-card-border/70">
              <td className="px-2 py-2 font-medium text-foreground">{row.actionType}</td>
              <td className="px-2 py-2 text-foreground/85">{row.actorLabel}</td>
              <td className="px-2 py-2 text-foreground/85">
                {row.targetType}:{row.targetId ?? "-"}
              </td>
              <td className="px-2 py-2">
                <StatusChip value={row.outcome} />
              </td>
              <td className="px-2 py-2 text-xs text-muted">{row.metadataPreview ?? "-"}</td>
              <td className="px-2 py-2 text-muted">{row.timestamp.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
