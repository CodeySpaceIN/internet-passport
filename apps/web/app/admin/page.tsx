import Link from "next/link";
import type { Route } from "next";
import { requirePermission } from "@/lib/auth/server";
import { getTenantIdFromSession } from "@/lib/data/app-dashboard";
import { getAdminDashboardData } from "@/lib/data/admin-console";
import { AdminMetricCard } from "@/components/admin/admin-metric-card";
import { AdminTableCard } from "@/components/admin/admin-table-card";
import { AuditLogTable } from "@/components/app/audit-log-table";
export default async function AdminPage() {
  const session = await requirePermission("admin:access");
  const tenantId = getTenantIdFromSession(session);
  if (!tenantId) return null;
  const dashboard = await getAdminDashboardData(tenantId);

  return (
    <div className="space-y-4">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard label="Open reviews" value={dashboard.kpis.openReviews} tone="amber" />
        <AdminMetricCard label="Open flags" value={dashboard.kpis.openFlags} tone="rose" />
        <AdminMetricCard label="Failed verifications" value={dashboard.kpis.failedVerifications} tone="rose" />
        <AdminMetricCard label="Suspicious API events" value={dashboard.kpis.suspiciousApi} tone="amber" />
        <AdminMetricCard label="Active users" value={dashboard.kpis.activeUsers} />
        <AdminMetricCard label="Organizations" value={dashboard.kpis.activeOrgs} />
        <AdminMetricCard label="Agents" value={dashboard.kpis.activeAgents} />
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        {[
          { href: "/admin/reviews", label: "Review queue", description: "Process manual reviews and status transitions." },
          { href: "/admin/flags", label: "Suspicious activity queue", description: "Resolve or dismiss high-risk flags with notes." },
          { href: "/admin/audit", label: "Audit investigations", description: "Search admin and API-driven events quickly." },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href as Route}
            className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300"
          >
            <p className="text-sm font-semibold text-slate-900">{item.label}</p>
            <p className="mt-1 text-sm text-slate-600">{item.description}</p>
          </Link>
        ))}
      </section>

      <AdminTableCard
        title="Recent audit activity"
        description="Immediate visibility into operator and automation decisions."
      >
        <AuditLogTable
          rows={dashboard.recentAudit.map((entry) => ({
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
    </div>
  );
}
