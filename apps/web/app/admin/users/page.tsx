import { AdminTableCard } from "@/components/admin/admin-table-card";
import { StatusChip } from "@/components/app/status-chip";
import { requirePermission } from "@/lib/auth/server";
import { getTenantIdFromSession } from "@/lib/data/app-dashboard";
import { getAdminUsersData, getTrustSummaryForTarget } from "@/lib/data/admin-console";
import { restoreEntityAction, suspendEntityAction } from "../actions";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const session = await requirePermission("admin:access");
  const tenantId = getTenantIdFromSession(session);
  if (!tenantId) return null;
  const params = (await searchParams) ?? {};
  const q = readParam(params, "q");
  const selectedUserId = readParam(params, "userId");
  const users = await getAdminUsersData(tenantId, q || undefined);
  const selected = users.find((item) => item.id === selectedUserId) ?? users[0] ?? null;
  const trust = selected ? await getTrustSummaryForTarget(tenantId, { userId: selected.id }) : null;

  return (
    <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <AdminTableCard title="User directory">
          <form method="GET" className="mb-3 flex gap-2">
            <input name="q" defaultValue={q} placeholder="Search by name or email" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
            <button type="submit" className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white">
              Search
            </button>
          </form>
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th className="px-2 py-2">User</th>
                <th className="px-2 py-2">State</th>
                <th className="px-2 py-2">Trust</th>
                <th className="px-2 py-2">Inspect</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-slate-100">
                  <td className="px-2 py-2">
                    <p className="font-medium text-slate-900">{user.name ?? "-"}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </td>
                  <td className="px-2 py-2">
                    <StatusChip value={user.deletedAt ? "SUSPENDED" : "ACTIVE"} />
                  </td>
                  <td className="px-2 py-2 text-slate-700">{user.trustScores[0]?.score ?? "-"}</td>
                  <td className="px-2 py-2">
                    <a href={`/admin/users?userId=${user.id}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className="text-xs text-slate-700 underline">
                      Open
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminTableCard>

        <AdminTableCard title="User inspection">
          {!selected ? (
            <p className="text-sm text-slate-600">No user found.</p>
          ) : (
            <div className="space-y-3 text-sm">
              <p className="font-medium text-slate-900">{selected.email}</p>
              <p className="text-slate-600">Trust score: {trust?.trustScore?.score ?? "-"} | Risk: {trust?.riskTier ?? "-"}</p>
              <div>
                <p className="mb-1 text-xs uppercase tracking-[0.12em] text-slate-500">Verification history</p>
                <ul className="space-y-1 text-slate-700">
                  {selected.verificationRecords.map((item) => (
                    <li key={item.id}>
                      {item.verificationType} - {item.state}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-1 text-xs uppercase tracking-[0.12em] text-slate-500">Audit history</p>
                <ul className="space-y-1 text-slate-700">
                  {selected.auditLogsAsActor.map((item) => (
                    <li key={item.id}>
                      {item.actionType} ({new Date(item.createdAt).toLocaleString()})
                    </li>
                  ))}
                </ul>
              </div>

              <form action={suspendEntityAction} className="space-y-2">
                <input type="hidden" name="entityType" value="user" />
                <input type="hidden" name="entityId" value={selected.id} />
                <input name="reason" placeholder="Suspend reason" className="w-full rounded border border-slate-300 px-2 py-1 text-xs" />
                <button type="submit" className="rounded border border-rose-300 bg-rose-50 px-2 py-1 text-xs text-rose-700">
                  Suspend user
                </button>
              </form>
              <form action={restoreEntityAction} className="space-y-2">
                <input type="hidden" name="entityType" value="user" />
                <input type="hidden" name="entityId" value={selected.id} />
                <input name="reason" placeholder="Restore note" className="w-full rounded border border-slate-300 px-2 py-1 text-xs" />
                <button type="submit" className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
                  Restore user
                </button>
              </form>
            </div>
          )}
        </AdminTableCard>
    </div>
  );
}
