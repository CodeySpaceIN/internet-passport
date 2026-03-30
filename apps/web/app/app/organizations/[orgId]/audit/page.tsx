import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { AuditLogTable } from "@/components/app/audit-log-table";
import { WorkspaceShell } from "@/components/app/workspace-shell";
import { OrganizationWorkspaceNav } from "@/components/org/organization-workspace-nav";
import { getServerSessionOrRedirect } from "@/lib/auth/server";
import { getTenantIdFromSession } from "@/lib/data/app-dashboard";
import { getOrganizationAuditDataPaginated, getOrganizationWorkspaceData } from "@/lib/data/org-workspace";
import { requireOrganizationAccess } from "@/lib/org/access";
import Link from "next/link";
import type { Route } from "next";

type OrgAuditPageProps = {
  params: Promise<{ orgId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function OrganizationAuditPage({ params, searchParams }: OrgAuditPageProps) {
  const session = await getServerSessionOrRedirect();
  const tenantId = getTenantIdFromSession(session);
  if (!tenantId) return null;
  const { orgId } = await params;
  const queryParams = (await searchParams) ?? {};
  const query = readParam(queryParams, "query");
  const outcome = readParam(queryParams, "outcome") || "ALL";
  const page = Number(readParam(queryParams, "page") || "1");
  requireOrganizationAccess(session, orgId, "view");
  const [organization, auditData] = await Promise.all([
    getOrganizationWorkspaceData(tenantId, orgId),
    getOrganizationAuditDataPaginated(tenantId, orgId, {
      query: query || undefined,
      outcome,
      page: Number.isFinite(page) ? page : 1,
      pageSize: 20,
    }),
  ]);
  if (!organization) notFound();

  return (
    <WorkspaceShell title={`${organization.name} · Audit`} subtitle="Tamper-aware organization activity and configuration timeline.">
      <OrganizationWorkspaceNav orgId={orgId} />
      <Card>
        <h2 className="text-lg font-semibold">Organization audit timeline</h2>
        <form method="GET" className="mt-3 grid gap-2 md:grid-cols-[1fr_180px_auto]">
          <input
            name="query"
            defaultValue={query}
            placeholder="Filter by action type"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          />
          <select
            name="outcome"
            defaultValue={outcome}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="ALL">All outcomes</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="FAILURE">FAILURE</option>
          </select>
          <button type="submit" className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800">
            Apply
          </button>
        </form>
        <div className="mt-4">
          <AuditLogTable
            rows={auditData.auditLogs.map((entry) => ({
              id: entry.id,
              actionType: entry.actionType,
              actorLabel: entry.actorUser?.name ?? entry.actorUser?.email ?? entry.actorAgent?.displayName ?? "System",
              targetType: entry.resourceType,
              targetId: entry.resourceId ?? null,
              outcome: entry.outcome,
              timestamp: entry.createdAt,
              metadataPreview:
                entry.metadataJson && typeof entry.metadataJson === "object"
                  ? JSON.stringify(entry.metadataJson).slice(0, 80)
                  : undefined,
            }))}
          />
        </div>
        {auditData.total > auditData.pageSize ? (
          <div className="mt-4 flex items-center justify-between text-xs text-slate-600">
            <p>
              Page {auditData.page} of {Math.max(1, Math.ceil(auditData.total / auditData.pageSize))}
            </p>
            <div className="flex items-center gap-2">
              {auditData.page > 1 ? (
                <Link
                  href={`/app/organizations/${orgId}/audit?query=${encodeURIComponent(query)}&outcome=${encodeURIComponent(outcome)}&page=${auditData.page - 1}` as Route}
                  className="rounded border border-slate-200 px-2 py-1 hover:bg-slate-50"
                >
                  Previous
                </Link>
              ) : null}
              {auditData.page * auditData.pageSize < auditData.total ? (
                <Link
                  href={`/app/organizations/${orgId}/audit?query=${encodeURIComponent(query)}&outcome=${encodeURIComponent(outcome)}&page=${auditData.page + 1}` as Route}
                  className="rounded border border-slate-200 px-2 py-1 hover:bg-slate-50"
                >
                  Next
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </Card>
    </WorkspaceShell>
  );
}
