import { StatusChip } from "@/components/app/status-chip";

type Row = {
  id: string;
  name: string;
  email: string;
  role: string;
  joinedAt: Date;
  latestVerification: string;
  linkedIdentities: number;
};

export function MemberStatusTable({ rows }: { rows: Row[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-slate-600">
            <th className="px-2 py-2">Member</th>
            <th className="px-2 py-2">Role</th>
            <th className="px-2 py-2">Verification</th>
            <th className="px-2 py-2">Linked Identities</th>
            <th className="px-2 py-2">Joined</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-slate-100">
              <td className="px-2 py-2">
                <p className="font-medium text-slate-900">{row.name}</p>
                <p className="text-xs text-slate-500">{row.email}</p>
              </td>
              <td className="px-2 py-2">
                <StatusChip value={row.role} />
              </td>
              <td className="px-2 py-2">
                <StatusChip value={row.latestVerification} />
              </td>
              <td className="px-2 py-2 text-slate-700">{row.linkedIdentities}</td>
              <td className="px-2 py-2 text-slate-600">{row.joinedAt.toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
