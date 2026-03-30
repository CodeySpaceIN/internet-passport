import { AdminTableCard } from "@/components/admin/admin-table-card";
import { AuditLogTable } from "@/components/app/audit-log-table";
import { requirePermission } from "@/lib/auth/server";
import { getTenantIdFromSession } from "@/lib/data/app-dashboard";
import { getAdminAuditData } from "@/lib/data/admin-console";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function AdminAuditPage({ searchParams }: PageProps) {
  const session = await requirePermission("admin:access");
  const tenantId = getTenantIdFromSession(session);
  if (!tenantId) return null;
  const params = (await searchParams) ?? {};
  const query = readParam(params, "q");
  const outcome = readParam(params, "outcome") || "ALL";
  const page = Math.max(1, Number(readParam(params, "page") || "1"));
  const data = await getAdminAuditData(tenantId, { query, outcome, page, pageSize: 25 });

  return (
    <AdminTableCard title="Audit events">
        <form method="GET" className="mb-3 grid gap-2 md:grid-cols-[1fr_180px_auto]">
          <input
            name="q"
            defaultValue={query}
            placeholder="Filter action/resource/id"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
          <select name="outcome" defaultValue={outcome} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
            <option value="ALL">All outcomes</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="FAILURE">FAILURE</option>
          </select>
          <button type="submit" className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white">
            Apply
          </button>
        </form>
        <AuditLogTable
          rows={data.items.map((entry) => ({
            id: entry.id,
            actionType: entry.actionType,
            actorLabel: entry.actorUser?.name ?? entry.actorUser?.email ?? entry.actorAgent?.displayName ?? "System",
            targetType: entry.resourceType,
            targetId: entry.resourceId ?? null,
            outcome: entry.outcome,
            timestamp: entry.createdAt,
            metadataPreview:
              entry.metadataJson && typeof entry.metadataJson === "object"
                ? JSON.stringify(entry.metadataJson).slice(0, 120)
                : undefined,
          }))}
        />
    </AdminTableCard>
  );
}
