import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/app/status-chip";
import { EmptyState } from "@/components/app/empty-state";
import { WorkspaceShell } from "@/components/app/workspace-shell";
import { OrganizationWorkspaceNav } from "@/components/org/organization-workspace-nav";
import { getServerSessionOrRedirect } from "@/lib/auth/server";
import { getTenantIdFromSession } from "@/lib/data/app-dashboard";
import { getOrganizationAgentsData, getOrganizationWorkspaceData } from "@/lib/data/org-workspace";
import { canManageOrganization, requireOrganizationAccess } from "@/lib/org/access";
import { createOrganizationAgentAction, updateOrganizationAgentStatusAction } from "../../actions";
import Link from "next/link";
import type { Route } from "next";

type OrgAgentsPageProps = {
  params: Promise<{ orgId: string }>;
};

const lifecycleStatuses = ["pending", "active", "suspended"] as const;

export default async function OrganizationAgentsPage({ params }: OrgAgentsPageProps) {
  const session = await getServerSessionOrRedirect();
  const tenantId = getTenantIdFromSession(session);
  if (!tenantId) return null;
  const { orgId } = await params;
  const membership = requireOrganizationAccess(session, orgId, "view");
  const canManage = canManageOrganization(membership.role);
  const [organization, data] = await Promise.all([
    getOrganizationWorkspaceData(tenantId, orgId),
    getOrganizationAgentsData(tenantId, orgId),
  ]);
  if (!organization) notFound();

  return (
    <WorkspaceShell title={`${organization.name} · Agents`} subtitle="Agent registration entry points and operational status controls.">
      <OrganizationWorkspaceNav orgId={orgId} />

      {canManage ? (
        <Card className="mb-4">
          <h2 className="text-lg font-semibold">Register organization agent</h2>
          <form action={createOrganizationAgentAction} className="mt-3 grid gap-3 md:grid-cols-2">
            <input type="hidden" name="orgId" value={orgId} />
            <input
              name="displayName"
              placeholder="Agent display name"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            <input
              name="handle"
              placeholder="Handle (unique)"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            <input
              name="purpose"
              placeholder="Purpose"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm md:col-span-2"
            />
            <input
              name="capabilities"
              placeholder="Capabilities (comma-separated)"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm md:col-span-2"
            />
            <select
              name="lifecycleStatus"
              defaultValue="pending"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              {lifecycleStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <input
              name="description"
              placeholder="Description (optional)"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            <button type="submit" className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white md:col-span-2">
              Create agent entry point
            </button>
          </form>
        </Card>
      ) : null}

      <Card>
        <h2 className="text-lg font-semibold">Agent inventory</h2>
        <div className="mt-4 grid gap-3">
          {data.agents.length === 0 ? (
            <EmptyState
              title="No agents registered"
              message="Create your first agent entry point to start signing and validating agent actions."
            />
          ) : (
            data.agents.map((agent) => (
              <div key={agent.id} className="rounded-lg border border-slate-200 bg-white p-3">
                {(() => {
                  const meta =
                    typeof agent.metadataJson === "object" && agent.metadataJson !== null
                      ? (agent.metadataJson as Record<string, unknown>)
                      : {};
                  const lifecycleStatus = String(
                    meta.lifecycleStatus ?? (agent.status === "ACTIVE" ? "active" : "suspended"),
                  );
                  const capabilities = Array.isArray(meta.capabilities) ? (meta.capabilities as string[]) : [];
                  const handle = typeof meta.handle === "string" ? meta.handle : agent.slug;
                  return (
                    <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{agent.displayName}</p>
                    <p className="text-xs text-slate-500">@{handle}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusChip value={lifecycleStatus} />
                    <StatusChip value={agent.trustScores[0]?.tier ?? "UNTRUSTED"} />
                  </div>
                </div>
                <p className="mt-1 text-sm text-slate-700">{agent.description ?? "No description"}</p>
                {capabilities.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {capabilities.map((capability) => (
                      <span key={capability} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-700">
                        {capability}
                      </span>
                    ))}
                  </div>
                ) : null}
                <p className="mt-1 text-xs text-slate-500">
                  Managed by {agent.manager?.name ?? agent.manager?.email ?? "Unassigned"}
                </p>
                <div className="mt-2">
                  <Link
                    href={`/app/agents/${agent.id}` as Route}
                    className="text-xs font-medium text-slate-700 hover:text-slate-900"
                  >
                    Open registry profile →
                  </Link>
                </div>
                {canManage ? (
                  <form action={updateOrganizationAgentStatusAction} className="mt-3 flex items-center gap-2">
                    <input type="hidden" name="orgId" value={orgId} />
                    <input type="hidden" name="agentId" value={agent.id} />
                    <select
                      name="lifecycleStatus"
                      defaultValue={lifecycleStatus}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    >
                      {lifecycleStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800">
                      Update status
                    </button>
                  </form>
                ) : null}
                    </>
                  );
                })()}
              </div>
            ))
          )}
        </div>
      </Card>
    </WorkspaceShell>
  );
}
