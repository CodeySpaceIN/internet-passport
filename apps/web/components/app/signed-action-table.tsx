import { StatusChip } from "@/components/app/status-chip";

type SignedActionRow = {
  id: string;
  actionType: string;
  resourceType: string;
  resourceId: string;
  verificationStatus: string;
  createdAt: Date;
  expiresAt: Date;
  contextType: string;
};

export function SignedActionTable({ rows }: { rows: SignedActionRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-slate-600">
            <th className="px-2 py-2">Action</th>
            <th className="px-2 py-2">Target</th>
            <th className="px-2 py-2">Context</th>
            <th className="px-2 py-2">Status</th>
            <th className="px-2 py-2">Created</th>
            <th className="px-2 py-2">Expires</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-slate-100">
              <td className="px-2 py-2 font-medium text-slate-900">{row.actionType}</td>
              <td className="px-2 py-2 text-slate-700">
                {row.resourceType}:{row.resourceId}
              </td>
              <td className="px-2 py-2 text-slate-700">{row.contextType}</td>
              <td className="px-2 py-2">
                <StatusChip value={row.verificationStatus} />
              </td>
              <td className="px-2 py-2 text-slate-600">{row.createdAt.toLocaleString()}</td>
              <td className="px-2 py-2 text-slate-600">{row.expiresAt.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
