import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/app/empty-state";
import { StatusChip } from "@/components/app/status-chip";
import { WorkspaceShell } from "@/components/app/workspace-shell";
import { getServerSessionOrRedirect } from "@/lib/auth/server";
import { getOrganizationsData, getTenantIdFromSession } from "@/lib/data/app-dashboard";
import { createOrganizationAction } from "./actions";
import Link from "next/link";
import type { Route } from "next";

export default async function OrganizationsPage() {
  const session = await getServerSessionOrRedirect();
  const tenantId = getTenantIdFromSession(session);
  if (!tenantId) return null;

  const organizations = await getOrganizationsData(tenantId);

  if (organizations.length === 0) {
    return (
      <WorkspaceShell title="Organizations" subtitle="Manage tenant organizations, domains, and member access.">
        <Card>
          <h2 className="text-xl font-semibold">Organizations</h2>
          <div className="mt-4">
            <EmptyState
              title="No organizations connected"
              message="Create an organization to manage domains, members, and verification policies."
            />
          </div>
        </Card>
      </WorkspaceShell>
    );
  }

  return (
    <WorkspaceShell title="Organizations" subtitle="Manage tenant organizations, domains, and member access.">
      <Card className="mb-4">
        <h2 className="text-lg font-semibold">Create organization</h2>
        <form action={createOrganizationAction} className="mt-3 grid gap-3 md:grid-cols-3">
          <input
            name="name"
            placeholder="Organization name"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          />
          <input
            name="legalName"
            placeholder="Legal name (optional)"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          />
          <input
            name="websiteUrl"
            placeholder="Website URL (optional)"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white md:col-span-3">
            Create organization
          </button>
        </form>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {organizations.map((org) => (
          <Card key={org.id} className="h-full">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">{org.name}</h3>
            <StatusChip value={org.status} />
          </div>
          <p className="mt-1 text-sm text-slate-600">{org.legalName ?? org.slug}</p>
          <p className="text-xs text-slate-500">{org.websiteUrl ?? "No website URL"}</p>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border border-slate-200 bg-white p-2">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Members</p>
              <p className="mt-1 text-lg font-semibold">{org.members.length}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-2">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Domains</p>
              <p className="mt-1 text-lg font-semibold">{org.domains.length}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-2">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Trust tier</p>
              <p className="mt-1 text-lg font-semibold">{org.trustScores[0]?.tier ?? "-"}</p>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Domains</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {org.domains.length > 0 ? (
                org.domains.map((domain) => (
                  <div key={domain.id} className="rounded-full border border-slate-200 bg-white px-3 py-1">
                    <span className="text-xs text-slate-700">{domain.domain}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No domains linked yet.</p>
              )}
            </div>
          </div>

          <div className="mt-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Members</p>
            <ul className="mt-2 space-y-2">
              {org.members.slice(0, 4).map((member) => (
                <li key={member.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{member.user.name ?? member.user.email}</p>
                    <p className="text-xs text-slate-500">{member.user.email}</p>
                  </div>
                  <StatusChip value={member.role} />
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-4">
            <Link
              href={`/app/organizations/${org.id}` as Route}
              className="inline-flex rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-100"
            >
              Open workspace
            </Link>
          </div>
          </Card>
        ))}
      </div>
    </WorkspaceShell>
  );
}
