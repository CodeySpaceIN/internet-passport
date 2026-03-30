import Link from "next/link";
import { notFound } from "next/navigation";
import type { Route } from "next";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/app/status-chip";
import { WorkspaceShell } from "@/components/app/workspace-shell";
import { AgentCredentialPanel } from "@/components/org/agent-credential-panel";
import { getServerSessionOrRedirect } from "@/lib/auth/server";
import { getTenantIdFromSession } from "@/lib/data/app-dashboard";
import { getAgentRegistryData } from "@/lib/data/org-workspace";
import { canManageOrganization, requireOrganizationAccess } from "@/lib/org/access";
import { toggleAgentPublicTrustCardAction } from "../../organizations/actions";

type AgentRegistryPageProps = {
  params: Promise<{ agentId: string }>;
};

export default async function AgentRegistryPage({ params }: AgentRegistryPageProps) {
  const session = await getServerSessionOrRedirect();
  const tenantId = getTenantIdFromSession(session);
  if (!tenantId) return null;
  const { agentId } = await params;

  const data = await getAgentRegistryData(tenantId, agentId);
  if (!data.agent) notFound();
  if (data.agent.organizationId) {
    requireOrganizationAccess(session, data.agent.organizationId, "view");
  }
  const canManage = data.agent.organizationId
    ? canManageOrganization(
        session.user.organizationMemberships.find((membership) => membership.organizationId === data.agent?.organizationId)?.role ?? "",
      )
    : false;

  const meta =
    typeof data.agent.metadataJson === "object" && data.agent.metadataJson !== null
      ? (data.agent.metadataJson as Record<string, unknown>)
      : {};
  const lifecycleStatus = String(meta.lifecycleStatus ?? (data.agent.status === "ACTIVE" ? "active" : "suspended"));
  const capabilities = Array.isArray(meta.capabilities) ? (meta.capabilities as string[]) : [];
  const purpose = typeof meta.purpose === "string" ? meta.purpose : data.agent.description ?? "";
  const handle = typeof meta.handle === "string" ? meta.handle : data.agent.slug;

  return (
    <WorkspaceShell title={`Agent Registry · ${data.agent.displayName}`} subtitle="AI agent identity profile, credentials, trust posture, and audit history.">
      <div className="mb-4">
        <Link
          href={`/app/organizations/${data.agent.organizationId}/agents` as Route}
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          ← Back to organization agents
        </Link>
      </div>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <h2 className="text-lg font-semibold">Agent identity profile</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Name</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{data.agent.displayName}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Handle</p>
              <p className="mt-1 font-mono text-sm text-slate-800">{handle}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Operational status</p>
              <div className="mt-1">
                <StatusChip value={lifecycleStatus} />
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Platform status</p>
              <div className="mt-1">
                <StatusChip value={data.agent.status} />
              </div>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Purpose</p>
              <p className="mt-1 text-sm text-slate-700">{purpose || "No purpose defined yet."}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Capabilities</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {capabilities.length === 0 ? (
                  <p className="text-sm text-slate-500">No capabilities defined.</p>
                ) : (
                  capabilities.map((capability) => (
                    <span key={capability} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700">
                      {capability}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold">Trust profile</h2>
          <p className="mt-1 text-xs text-slate-500">Clear trust state for enterprise oversight.</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{data.trustScore?.score ?? "-"}</p>
          <div className="mt-2 flex items-center gap-2">
            <StatusChip value={data.trustScore?.tier ?? "UNTRUSTED"} />
            <StatusChip value={data.riskSignals.length > 0 ? "elevated_risk" : "stable"} />
          </div>
          {data.trustScore?.reasonCodes.length ? (
            <ul className="mt-3 space-y-1 text-xs text-slate-600">
              {data.trustScore.reasonCodes.slice(0, 6).map((reason) => (
                <li key={reason}>- {reason}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-500">No trust explanations yet.</p>
          )}
        </Card>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold">Credential registry</h2>
          <p className="mt-1 text-xs text-slate-500">
            Secret values are hashed at rest and only shown once on generation or rotation.
          </p>
          <div className="mt-4">
            <AgentCredentialPanel
              agentId={data.agent.id}
              canManage={canManage}
              credentials={data.credentials.map((item) => ({
                id: item.id,
                keyId: item.keyId,
                credentialType: item.credentialType,
                algorithm: item.algorithm,
                createdAt: item.createdAt.toISOString(),
                expiresAt: item.expiresAt ? item.expiresAt.toISOString() : null,
                revokedAt: item.revokedAt ? item.revokedAt.toISOString() : null,
              }))}
            />
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold">Public trust card</h2>
          <p className="mt-1 text-xs text-slate-500">Optional public identity card for agent trust portability.</p>
          <div className="mt-3">
            <StatusChip value={data.trustCard?.status ?? "DRAFT"} />
          </div>
          <p className="mt-2 text-sm text-slate-700">
            {data.trustCard
              ? `Slug: ${data.trustCard.slug}`
              : "Trust card not created yet. Publishing creates or updates agent public profile."}
          </p>
          {data.trustCard?.slug ? (
            <p className="mt-2 text-sm text-slate-700">
              Public URL:{" "}
              <Link href={`/trust/${data.trustCard.slug}` as Route} className="underline">
                /trust/{data.trustCard.slug}
              </Link>
            </p>
          ) : null}
          {canManage ? (
            <div className="mt-3 flex items-center gap-2">
              <form action={toggleAgentPublicTrustCardAction}>
                <input type="hidden" name="agentId" value={data.agent.id} />
                <input type="hidden" name="makePublic" value="true" />
                <button type="submit" className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white">
                  Publish
                </button>
              </form>
              <form action={toggleAgentPublicTrustCardAction}>
                <input type="hidden" name="agentId" value={data.agent.id} />
                <input type="hidden" name="makePublic" value="false" />
                <button type="submit" className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800">
                  Unpublish
                </button>
              </form>
            </div>
          ) : null}
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Signed identity model</p>
            <p className="mt-1 text-sm text-slate-700">
              Placeholder ready for future cryptographic attestations and signed identity envelopes.
            </p>
          </div>
        </Card>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold">Verification timeline</h2>
          <div className="mt-3 space-y-2">
            {data.verifications.length === 0 ? (
              <p className="text-sm text-slate-500">No verification events yet.</p>
            ) : (
              data.verifications.map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-900">{item.verificationType}</p>
                    <StatusChip value={item.state} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</p>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold">Audit history</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="px-2 py-2">Action</th>
                  <th className="px-2 py-2">Actor</th>
                  <th className="px-2 py-2">Outcome</th>
                  <th className="px-2 py-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {data.auditLogs.map((entry) => (
                  <tr key={entry.id} className="border-b border-slate-100">
                    <td className="px-2 py-2 font-medium text-slate-900">{entry.actionType}</td>
                    <td className="px-2 py-2 text-slate-700">{entry.actorUser?.name ?? entry.actorUser?.email ?? "System"}</td>
                    <td className="px-2 py-2">
                      <StatusChip value={entry.outcome} />
                    </td>
                    <td className="px-2 py-2 text-slate-600">{new Date(entry.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </WorkspaceShell>
  );
}
