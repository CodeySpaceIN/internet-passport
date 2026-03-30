import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/app/status-chip";
import { WorkspaceShell } from "@/components/app/workspace-shell";
import { OrganizationWorkspaceNav } from "@/components/org/organization-workspace-nav";
import { TrustPostureCards } from "@/components/org/trust-posture-cards";
import { getServerSessionOrRedirect } from "@/lib/auth/server";
import { getTenantIdFromSession } from "@/lib/data/app-dashboard";
import { getOrganizationTrustPosture, getOrganizationWorkspaceData } from "@/lib/data/org-workspace";
import { requireOrganizationAccess } from "@/lib/org/access";
import { createOrganizationApiKeyAction, revokeOrganizationApiKeyAction } from "../actions";

type OrgOverviewPageProps = {
  params: Promise<{ orgId: string }>;
};

export default async function OrganizationOverviewPage({ params }: OrgOverviewPageProps) {
  const session = await getServerSessionOrRedirect();
  const tenantId = getTenantIdFromSession(session);
  if (!tenantId) return null;
  const { orgId } = await params;
  const membership = requireOrganizationAccess(session, orgId, "view");

  const [organization, posture] = await Promise.all([
    getOrganizationWorkspaceData(tenantId, orgId),
    getOrganizationTrustPosture(tenantId, orgId),
  ]);
  if (!organization) notFound();

  const passedCount = posture.verifications.filter((item) => item.state === "PASSED").length;
  const verificationPassRate =
    posture.verifications.length > 0 ? Math.round((passedCount / posture.verifications.length) * 100) : 0;

  return (
    <WorkspaceShell title={organization.name} subtitle="Organization overview, trust posture, and access controls.">
      <OrganizationWorkspaceNav orgId={orgId} />
      <TrustPostureCards
        score={posture.currentTrustScore?.score ?? null}
        tier={posture.currentTrustScore?.tier ?? null}
        activeSignals={posture.riskSignals.length}
        verificationPassRate={verificationPassRate}
      />

      <section className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold">Organization profile</h2>
          <div className="mt-3 space-y-2 text-sm">
            <p>
              <span className="text-slate-500">Slug:</span> {organization.slug}
            </p>
            <p>
              <span className="text-slate-500">Website:</span> {organization.websiteUrl ?? "-"}
            </p>
            <p>
              <span className="text-slate-500">Legal:</span> {organization.legalName ?? "-"}
            </p>
            <p>
              <span className="text-slate-500">Your role:</span> <StatusChip value={membership.role} className="ml-2" />
            </p>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold">API key management</h2>
          <form action={createOrganizationApiKeyAction} className="mt-3 grid gap-2">
            <input type="hidden" name="orgId" value={orgId} />
            <input
              name="name"
              placeholder="New key name"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            <input
              name="scopes"
              placeholder="Scopes (comma-separated)"
              defaultValue="verifications:write,trust:evaluate,webhooks:write"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            <button type="submit" className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white">
              Create API key
            </button>
          </form>

          <div className="mt-4 space-y-2">
            {posture.apiKeys.length === 0 ? (
              <p className="text-sm text-slate-500">No organization keys yet.</p>
            ) : (
              posture.apiKeys.map((key) => (
                <div key={key.id} className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{key.name}</p>
                      <p className="font-mono text-xs text-slate-500">{key.keyPrefix}</p>
                    </div>
                    <StatusChip value={key.status} />
                  </div>
                  <p className="mt-1 text-xs text-slate-600">{key.scopes.join(", ")}</p>
                  {key.status !== "REVOKED" ? (
                    <form action={revokeOrganizationApiKeyAction} className="mt-2">
                      <input type="hidden" name="orgId" value={orgId} />
                      <input type="hidden" name="apiKeyId" value={key.id} />
                      <button type="submit" className="text-xs font-medium text-rose-600 hover:text-rose-700">
                        Revoke key
                      </button>
                    </form>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </Card>
      </section>
    </WorkspaceShell>
  );
}
