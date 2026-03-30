import { Card } from "@/components/ui/card";
import { ActivityTimeline } from "@/components/app/activity-timeline";
import { AuditLogTable } from "@/components/app/audit-log-table";
import { SignedActionTable } from "@/components/app/signed-action-table";
import { WorkspaceShell } from "@/components/app/workspace-shell";
import { getServerSessionOrRedirect } from "@/lib/auth/server";
import { getActivityData, getTenantIdFromSession } from "@/lib/data/app-dashboard";

export default async function ActivityPage() {
  const session = await getServerSessionOrRedirect();
  const tenantId = getTenantIdFromSession(session);
  if (!tenantId) return null;

  const { auditLogs, signedActions } = await getActivityData(tenantId);
  const timelineItems = [
    ...auditLogs.map((entry) => ({
      id: `audit-${entry.id}`,
      title: `${entry.actionType} · ${entry.resourceType}`,
      subtitle: entry.resourceId ? `Resource: ${entry.resourceId}` : undefined,
      timestamp: entry.createdAt,
      status: entry.outcome,
    })),
    ...signedActions.map((entry) => ({
      id: `action-${entry.id}`,
      title: `${entry.actionType} signed`,
      subtitle: `${entry.resourceType}:${entry.resourceId}`,
      timestamp: entry.createdAt,
      status: entry.verificationStatus,
    })),
  ]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 60);

  return (
    <WorkspaceShell title="Activity" subtitle="Unified timeline across audit events and signed actions.">
      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Audit events</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{auditLogs.length}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Signed actions</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{signedActions.length}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Failed outcomes</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {auditLogs.filter((entry) => entry.outcome !== "SUCCESS").length}
          </p>
        </Card>
      </section>

      <Card className="mt-4">
        <h2 className="text-xl font-semibold">Activity Timeline</h2>
        <p className="mt-1 text-sm text-slate-600">
          Unified timeline for audit logs and signed action events across your tenant.
        </p>
        <div className="mt-5">
          <ActivityTimeline items={timelineItems} />
        </div>
      </Card>

      <Card className="mt-4">
        <h2 className="text-lg font-semibold">Audit Log Browser</h2>
        <div className="mt-4">
          <AuditLogTable
            rows={auditLogs.slice(0, 50).map((entry) => ({
              id: entry.id,
              actionType: entry.actionType,
              actorLabel: entry.actorUserId ?? entry.actorAgentId ?? entry.actorApiKeyId ?? "system",
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
      </Card>

      <Card className="mt-4">
        <h2 className="text-lg font-semibold">Signed Actions</h2>
        <div className="mt-4">
          <SignedActionTable
            rows={signedActions.slice(0, 50).map((entry) => ({
              id: entry.id,
              actionType: entry.actionType,
              resourceType: entry.resourceType,
              resourceId: entry.resourceId,
              verificationStatus: entry.verificationStatus,
              createdAt: entry.createdAt,
              expiresAt: entry.expiresAt,
              contextType: entry.contextType,
            }))}
          />
        </div>
      </Card>
    </WorkspaceShell>
  );
}
