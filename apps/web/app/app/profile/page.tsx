import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/app/empty-state";
import { StatusChip } from "@/components/app/status-chip";
import { WorkspaceShell } from "@/components/app/workspace-shell";
import { getServerSessionOrRedirect } from "@/lib/auth/server";
import { getProfileData, getTenantIdFromSession } from "@/lib/data/app-dashboard";
import { updateProfileAction } from "./actions";

export default async function ProfilePage() {
  const session = await getServerSessionOrRedirect();
  const tenantId = getTenantIdFromSession(session);
  if (!tenantId) return null;

  const { user, memberships, identities, sessions } = await getProfileData(tenantId, session.user.id);

  return (
    <WorkspaceShell title="Profile" subtitle="Identity, access, and session controls for your account.">
      <div className="space-y-4">
      <Card>
        <h2 className="text-xl font-semibold">Profile Settings</h2>
        <p className="mt-1 text-sm text-slate-600">Manage your identity and profile preferences.</p>
        <form action={updateProfileAction} className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm text-slate-600">Name</span>
            <input
              name="name"
              defaultValue={user?.name ?? ""}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm text-slate-600">Email</span>
            <input
              readOnly
              value={user?.email ?? ""}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white md:col-span-2 md:w-fit"
          >
            Save profile
          </button>
        </form>
      </Card>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <h3 className="text-lg font-semibold">Linked Identity Providers</h3>
          {identities.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title="No linked identity providers"
                message="Connect a provider to improve account recovery and trust continuity."
              />
            </div>
          ) : (
            <ul className="mt-4 space-y-2">
              {identities.map((item) => (
                <li key={item.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-900">{item.provider}</p>
                    <p className="text-xs text-slate-500">{new Date(item.linkedAt).toLocaleDateString()}</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{item.providerEmail ?? "No provider email"}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h3 className="text-lg font-semibold">Memberships and Access</h3>
          {memberships.length === 0 ? (
            <div className="mt-4">
              <EmptyState title="No memberships found" message="Join a tenant workspace to manage trust workflows." />
            </div>
          ) : (
            <ul className="mt-4 space-y-2">
              {memberships.map((membership) => (
                <li key={membership.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-900">Tenant: {membership.tenantId}</p>
                    <StatusChip value={membership.role} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <Card>
        <h3 className="text-lg font-semibold">Recent Sessions</h3>
        {sessions.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="No sessions" message="Active and historical sessions will appear here." />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">IP Address</th>
                  <th className="px-2 py-2">Expires</th>
                  <th className="px-2 py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((entry) => (
                  <tr key={entry.id} className="border-b border-slate-100">
                    <td className="px-2 py-2">
                      <StatusChip value={entry.status} />
                    </td>
                    <td className="px-2 py-2 text-slate-600">{entry.ipAddress ?? "-"}</td>
                    <td className="px-2 py-2 text-slate-600">{new Date(entry.expiresAt).toLocaleString()}</td>
                    <td className="px-2 py-2 text-slate-600">{new Date(entry.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      </div>
    </WorkspaceShell>
  );
}
