import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { WorkspaceShell } from "@/components/app/workspace-shell";
import { OrganizationWorkspaceNav } from "@/components/org/organization-workspace-nav";
import { MemberStatusTable } from "@/components/org/member-status-table";
import { getServerSessionOrRedirect } from "@/lib/auth/server";
import { getTenantIdFromSession } from "@/lib/data/app-dashboard";
import { getOrganizationMembersDataPaginated, getOrganizationWorkspaceData } from "@/lib/data/org-workspace";
import { canManageOrganization, requireOrganizationAccess } from "@/lib/org/access";
import {
  inviteOrganizationMemberAction,
  removeOrganizationMemberAction,
  updateOrganizationMemberRoleAction,
} from "../../actions";
import Link from "next/link";
import type { Route } from "next";

type OrgMembersPageProps = {
  params: Promise<{ orgId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const memberRoles = ["OWNER", "ADMIN", "SECURITY", "DEVELOPER", "ANALYST", "BILLING", "REVIEWER"] as const;

function readParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function OrganizationMembersPage({ params, searchParams }: OrgMembersPageProps) {
  const session = await getServerSessionOrRedirect();
  const tenantId = getTenantIdFromSession(session);
  if (!tenantId) return null;
  const { orgId } = await params;
  const queryParams = (await searchParams) ?? {};
  const query = readParam(queryParams, "query");
  const roleFilter = readParam(queryParams, "role") || "ALL";
  const page = Number(readParam(queryParams, "page") || "1");
  const membership = requireOrganizationAccess(session, orgId, "view");
  const canManage = canManageOrganization(membership.role);

  const [organization, memberData] = await Promise.all([
    getOrganizationWorkspaceData(tenantId, orgId),
    getOrganizationMembersDataPaginated(tenantId, orgId, {
      query: query || undefined,
      role: roleFilter,
      page: Number.isFinite(page) ? page : 1,
      pageSize: 12,
    }),
  ]);
  if (!organization) notFound();

  const rows = memberData.members.map((member) => ({
    id: member.id,
    name: member.user.name ?? member.user.email,
    email: member.user.email,
    role: member.role,
    joinedAt: member.joinedAt,
    latestVerification: memberData.latestVerificationByUser.get(member.userId)?.state ?? "PENDING",
    linkedIdentities: member.user.identityProviderLinks.length,
  }));

  return (
    <WorkspaceShell title={`${organization.name} · Members`} subtitle="Invite users, assign roles, and track verification status.">
      <OrganizationWorkspaceNav orgId={orgId} />

      {canManage ? (
        <Card className="mb-4">
          <h2 className="text-lg font-semibold">Invite member</h2>
          <form action={inviteOrganizationMemberAction} className="mt-3 grid gap-3 md:grid-cols-3">
            <input type="hidden" name="orgId" value={orgId} />
            <input
              name="email"
              placeholder="member@company.com"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            <select
              name="role"
              defaultValue="DEVELOPER"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              {memberRoles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            <button type="submit" className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white">
              Invite member
            </button>
          </form>
        </Card>
      ) : null}

      <Card>
        <h2 className="text-lg font-semibold">Member roster</h2>
        <p className="mt-1 text-sm text-slate-600">Enterprise-grade role and verification visibility per member.</p>
        <form method="GET" className="mt-3 grid gap-2 md:grid-cols-[1fr_180px_auto]">
          <input
            name="query"
            defaultValue={query}
            placeholder="Search name or email"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          />
          <select
            name="role"
            defaultValue={roleFilter}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="ALL">All roles</option>
            {memberRoles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <button type="submit" className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800">
            Apply
          </button>
        </form>
        <div className="mt-4">
          <MemberStatusTable rows={rows} />
        </div>
        {memberData.total > memberData.pageSize ? (
          <div className="mt-4 flex items-center justify-between text-xs text-slate-600">
            <p>
              Page {memberData.page} of {Math.max(1, Math.ceil(memberData.total / memberData.pageSize))}
            </p>
            <div className="flex items-center gap-2">
              {memberData.page > 1 ? (
                <Link
                  href={`/app/organizations/${orgId}/members?query=${encodeURIComponent(query)}&role=${encodeURIComponent(roleFilter)}&page=${memberData.page - 1}` as Route}
                  className="rounded border border-slate-200 px-2 py-1 hover:bg-slate-50"
                >
                  Previous
                </Link>
              ) : null}
              {memberData.page * memberData.pageSize < memberData.total ? (
                <Link
                  href={`/app/organizations/${orgId}/members?query=${encodeURIComponent(query)}&role=${encodeURIComponent(roleFilter)}&page=${memberData.page + 1}` as Route}
                  className="rounded border border-slate-200 px-2 py-1 hover:bg-slate-50"
                >
                  Next
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </Card>

      {canManage ? (
        <Card className="mt-4">
          <h2 className="text-lg font-semibold">Assign member roles</h2>
          <div className="mt-3 grid gap-2">
            {memberData.members.map((member) => (
              <form key={member.id} action={updateOrganizationMemberRoleAction} className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-[1fr_200px_auto]">
                <input type="hidden" name="orgId" value={orgId} />
                <input type="hidden" name="membershipId" value={member.id} />
                <div>
                  <p className="text-sm font-medium text-slate-900">{member.user.name ?? member.user.email}</p>
                  <p className="text-xs text-slate-500">{member.user.email}</p>
                </div>
                <select
                  name="role"
                  defaultValue={member.role}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  {memberRoles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
                <button type="submit" className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800">
                  Update role
                </button>
              </form>
            ))}
          </div>
          <div className="mt-4 grid gap-2">
            {memberData.members.map((member) => (
              <form key={`remove-${member.id}`} action={removeOrganizationMemberAction} className="flex items-center justify-between rounded-lg border border-rose-100 bg-rose-50 px-3 py-2">
                <input type="hidden" name="orgId" value={orgId} />
                <input type="hidden" name="membershipId" value={member.id} />
                <p className="text-xs text-rose-700">
                  Remove {member.user.name ?? member.user.email} from organization access.
                </p>
                <button type="submit" className="text-xs font-semibold text-rose-700 hover:text-rose-800">
                  Remove
                </button>
              </form>
            ))}
          </div>
        </Card>
      ) : null}
    </WorkspaceShell>
  );
}
