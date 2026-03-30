import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { WorkspaceShell } from "@/components/app/workspace-shell";
import { OrganizationWorkspaceNav } from "@/components/org/organization-workspace-nav";
import { getServerSessionOrRedirect } from "@/lib/auth/server";
import { getTenantIdFromSession } from "@/lib/data/app-dashboard";
import { getOrganizationWorkspaceData } from "@/lib/data/org-workspace";
import { canManageOrganization, requireOrganizationAccess } from "@/lib/org/access";
import { updateOrganizationSettingsAction } from "../../actions";

type OrgSettingsPageProps = {
  params: Promise<{ orgId: string }>;
};

const organizationTypes = ["COMPANY", "NON_PROFIT", "DAO", "GOVERNMENT", "COMMUNITY", "OTHER"] as const;

export default async function OrganizationSettingsPage({ params }: OrgSettingsPageProps) {
  const session = await getServerSessionOrRedirect();
  const tenantId = getTenantIdFromSession(session);
  if (!tenantId) return null;
  const { orgId } = await params;
  const membership = requireOrganizationAccess(session, orgId, "view");
  const canManage = canManageOrganization(membership.role);
  const organization = await getOrganizationWorkspaceData(tenantId, orgId);
  if (!organization) notFound();

  return (
    <WorkspaceShell title={`${organization.name} · Settings`} subtitle="Enterprise-grade configuration with strict manage-role guardrails.">
      <OrganizationWorkspaceNav orgId={orgId} />

      <Card>
        <h2 className="text-lg font-semibold">Organization settings</h2>
        {!canManage ? (
          <p className="mt-2 text-sm text-slate-600">You have view access only. Contact an OWNER, ADMIN, or SECURITY member to manage settings.</p>
        ) : (
          <form action={updateOrganizationSettingsAction} className="mt-4 grid gap-3 md:grid-cols-2">
            <input type="hidden" name="orgId" value={orgId} />
            <label className="text-xs text-slate-600">
              Organization name
              <input
                name="name"
                defaultValue={organization.name}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
              />
            </label>
            <label className="text-xs text-slate-600">
              Legal name
              <input
                name="legalName"
                defaultValue={organization.legalName ?? ""}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
              />
            </label>
            <label className="text-xs text-slate-600 md:col-span-2">
              Website URL (must include http:// or https://)
              <input
                name="websiteUrl"
                defaultValue={organization.websiteUrl ?? ""}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
              />
            </label>
            <label className="text-xs text-slate-600">
              Organization type
              <select
                name="organizationType"
                defaultValue={organization.organizationType}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
              >
                {organizationTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="self-end rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white">
              Save settings
            </button>
          </form>
        )}
      </Card>
    </WorkspaceShell>
  );
}
