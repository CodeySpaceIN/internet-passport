import { AdminTableCard } from "@/components/admin/admin-table-card";
import { StatusChip } from "@/components/app/status-chip";
import { requirePermission } from "@/lib/auth/server";
import { getTenantIdFromSession } from "@/lib/data/app-dashboard";
import { getFlagsQueueData } from "@/lib/data/admin-console";
import { resolveFlagAction } from "../actions";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function AdminFlagsPage({ searchParams }: PageProps) {
  const session = await requirePermission("admin:access");
  const tenantId = getTenantIdFromSession(session);
  if (!tenantId) return null;
  const params = (await searchParams) ?? {};
  const status = readParam(params, "status") || "ALL";
  const severity = readParam(params, "severity") || "ALL";
  const query = readParam(params, "q");
  const page = Math.max(1, Number(readParam(params, "page") || "1"));
  const data = await getFlagsQueueData(tenantId, { status, severity, query, page, pageSize: 20 });

  return (
    <AdminTableCard title="Admin flags" description="Open and in-review flags are operationally prioritized.">
        <form method="GET" className="mb-3 grid gap-2 md:grid-cols-[170px_170px_1fr_auto]">
          <select name="status" defaultValue={status} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
            <option value="ALL">All statuses</option>
            <option value="OPEN">OPEN</option>
            <option value="IN_REVIEW">IN_REVIEW</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="DISMISSED">DISMISSED</option>
          </select>
          <select name="severity" defaultValue={severity} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
            <option value="ALL">All severities</option>
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
          <input name="q" defaultValue={query} placeholder="Search reason code or description" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
          <button type="submit" className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white">
            Apply
          </button>
        </form>

        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-600">
              <th className="px-2 py-2">Reason</th>
              <th className="px-2 py-2">Target</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Severity</th>
              <th className="px-2 py-2">Raised</th>
              <th className="px-2 py-2">Manage</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => (
              <tr key={item.id} className="border-b border-slate-100 align-top">
                <td className="px-2 py-2">
                  <p className="font-medium text-slate-900">{item.reasonCode}</p>
                  <p className="text-xs text-slate-500">{item.description ?? "-"}</p>
                </td>
                <td className="px-2 py-2 text-xs text-slate-700">
                  {item.user ? `User: ${item.user.email}` : item.organization ? `Org: ${item.organization.name}` : item.agent ? `Agent: ${item.agent.displayName}` : "Unknown"}
                </td>
                <td className="px-2 py-2">
                  <StatusChip value={item.status} />
                </td>
                <td className="px-2 py-2">
                  <StatusChip value={item.severity} />
                </td>
                <td className="px-2 py-2 text-slate-600">{new Date(item.raisedAt).toLocaleString()}</td>
                <td className="px-2 py-2">
                  <form action={resolveFlagAction} className="space-y-1">
                    <input type="hidden" name="flagId" value={item.id} />
                    <select name="status" defaultValue={item.status} className="rounded border border-slate-300 px-2 py-1 text-xs">
                      <option value="RESOLVED">RESOLVED</option>
                      <option value="DISMISSED">DISMISSED</option>
                      <option value="IN_REVIEW">IN_REVIEW</option>
                    </select>
                    <input name="note" placeholder="Admin note" className="block w-full rounded border border-slate-300 px-2 py-1 text-xs" />
                    <button type="submit" className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700">
                      Save
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
    </AdminTableCard>
  );
}
