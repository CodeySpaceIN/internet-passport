import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/app/status-chip";
import { EmptyState } from "@/components/app/empty-state";
import { WorkspaceShell } from "@/components/app/workspace-shell";
import { OrganizationWorkspaceNav } from "@/components/org/organization-workspace-nav";
import { getServerSessionOrRedirect } from "@/lib/auth/server";
import { getTenantIdFromSession } from "@/lib/data/app-dashboard";
import { getOrganizationDomainsData, getOrganizationWorkspaceData } from "@/lib/data/org-workspace";
import { canManageOrganization, requireOrganizationAccess } from "@/lib/org/access";
import { createDomainChallengeAction, verifyDomainChallengeAction } from "../../actions";

type OrgDomainsPageProps = {
  params: Promise<{ orgId: string }>;
};

export default async function OrganizationDomainsPage({ params }: OrgDomainsPageProps) {
  const session = await getServerSessionOrRedirect();
  const tenantId = getTenantIdFromSession(session);
  if (!tenantId) return null;
  const { orgId } = await params;
  const membership = requireOrganizationAccess(session, orgId, "view");
  const canManage = canManageOrganization(membership.role);
  const [organization, data] = await Promise.all([
    getOrganizationWorkspaceData(tenantId, orgId),
    getOrganizationDomainsData(tenantId, orgId),
  ]);
  if (!organization) notFound();

  return (
    <WorkspaceShell title={`${organization.name} · Domains`} subtitle="Domain verification challenges, status, and historical outcomes.">
      <OrganizationWorkspaceNav orgId={orgId} />

      {canManage ? (
        <Card className="mb-4">
          <h2 className="text-lg font-semibold">Generate domain verification challenge</h2>
          <form action={createDomainChallengeAction} className="mt-3 flex flex-wrap items-center gap-2">
            <input type="hidden" name="orgId" value={orgId} />
            <input
              name="domain"
              placeholder="example.com"
              className="min-w-[280px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            <button type="submit" className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white">
              Create challenge
            </button>
          </form>
          <p className="mt-2 text-xs text-slate-600">Challenge token is generated and tracked in domain verification history.</p>
        </Card>
      ) : null}

      <Card>
        <h2 className="text-lg font-semibold">Domain verification history</h2>
        <div className="mt-4 grid gap-3">
          {data.domains.length === 0 ? (
            <EmptyState
              title="No domain records"
              message="Create a domain challenge to begin ownership verification."
            />
          ) : (
            data.domains.map((domain) => (
              <div key={domain.id} className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">{domain.domain}</p>
                  <StatusChip value={domain.status} />
                </div>
                <p className="mt-1 font-mono text-xs text-slate-600">{domain.challengeToken}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Created {new Date(domain.createdAt).toLocaleString()}
                  {domain.verifiedAt ? ` · Verified ${new Date(domain.verifiedAt).toLocaleString()}` : ""}
                </p>
                {canManage && domain.status !== "VERIFIED" ? (
                  <form action={verifyDomainChallengeAction} className="mt-2">
                    <input type="hidden" name="orgId" value={orgId} />
                    <input type="hidden" name="domainVerificationId" value={domain.id} />
                    <button type="submit" className="text-xs font-medium text-emerald-700 hover:text-emerald-800">
                      Mark verified (mock)
                    </button>
                  </form>
                ) : null}
              </div>
            ))
          )}
        </div>
      </Card>

      <Card className="mt-4">
        <h2 className="text-lg font-semibold">Related verification records</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th className="px-2 py-2">Type</th>
                <th className="px-2 py-2">State</th>
                <th className="px-2 py-2">Provider</th>
                <th className="px-2 py-2">Updated</th>
              </tr>
            </thead>
            <tbody>
              {data.verificationHistory.map((item) => (
                <tr key={item.id} className="border-b border-slate-100">
                  <td className="px-2 py-2 font-medium">{item.verificationType}</td>
                  <td className="px-2 py-2">
                    <StatusChip value={item.state} />
                  </td>
                  <td className="px-2 py-2 text-slate-700">{item.provider}</td>
                  <td className="px-2 py-2 text-slate-600">{new Date(item.updatedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </WorkspaceShell>
  );
}
