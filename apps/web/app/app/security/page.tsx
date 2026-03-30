import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/app/empty-state";
import { StatusChip } from "@/components/app/status-chip";
import { WorkspaceShell } from "@/components/app/workspace-shell";
import { getServerSessionOrRedirect } from "@/lib/auth/server";
import { getSecurityData, getTenantIdFromSession } from "@/lib/data/app-dashboard";

export default async function SecurityPage() {
  const session = await getServerSessionOrRedirect();
  const tenantId = getTenantIdFromSession(session);
  if (!tenantId) return null;

  const { signals, sessions, keys } = await getSecurityData(tenantId, session.user.id);

  return (
    <WorkspaceShell title="Security" subtitle="Monitor risk signals, sessions, and key hygiene.">
      <div className="grid gap-4 xl:grid-cols-3">
      <Card className="xl:col-span-2">
        <h2 className="text-xl font-semibold">Security Signals</h2>
        <p className="mt-1 text-sm text-slate-600">Recent risk signals affecting trust posture and policy outcomes.</p>
        {signals.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="No risk signals" message="Your environment is currently quiet." />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="px-2 py-2">Signal</th>
                  <th className="px-2 py-2">Severity</th>
                  <th className="px-2 py-2">Delta</th>
                  <th className="px-2 py-2">State</th>
                  <th className="px-2 py-2">Detected</th>
                </tr>
              </thead>
              <tbody>
                {signals.map((signal) => (
                  <tr key={signal.id} className="border-b border-slate-100">
                    <td className="px-2 py-2 font-medium">{signal.signalType}</td>
                    <td className="px-2 py-2">
                      <StatusChip value={signal.severity} />
                    </td>
                    <td className="px-2 py-2 text-slate-700">{signal.scoreDelta}</td>
                    <td className="px-2 py-2">
                      <StatusChip value={signal.isActive ? "ACTIVE" : "RESOLVED"} />
                    </td>
                    <td className="px-2 py-2 text-slate-600">{new Date(signal.detectedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <h3 className="text-lg font-semibold">Active Sessions</h3>
        {sessions.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="No sessions" message="Session events will appear after sign-in activity." />
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {sessions.map((entry) => (
              <li key={entry.id} className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between">
                  <StatusChip value={entry.status} />
                  <p className="text-xs text-slate-500">{new Date(entry.createdAt).toLocaleDateString()}</p>
                </div>
                <p className="mt-1 text-xs text-slate-600">IP: {entry.ipAddress ?? "Unknown"}</p>
                <p className="text-xs text-slate-600">Expires: {new Date(entry.expiresAt).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="xl:col-span-3">
        <h3 className="text-lg font-semibold">API Keys</h3>
        <p className="mt-1 text-sm text-slate-600">Review key lifecycle and usage timestamps.</p>
        {keys.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="No API keys" message="Generate a key to start making trusted API requests." />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="px-2 py-2">Name</th>
                  <th className="px-2 py-2">Prefix</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Scopes</th>
                  <th className="px-2 py-2">Last used</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((key) => (
                  <tr key={key.id} className="border-b border-slate-100">
                    <td className="px-2 py-2 font-medium">{key.name}</td>
                    <td className="px-2 py-2 font-mono text-xs text-slate-700">{key.keyPrefix}</td>
                    <td className="px-2 py-2">
                      <StatusChip value={key.status} />
                    </td>
                    <td className="px-2 py-2 text-slate-700">{key.scopes.join(", ") || "-"}</td>
                    <td className="px-2 py-2 text-slate-600">
                      {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : "Never"}
                    </td>
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
