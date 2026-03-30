import { Card } from "@/components/ui/card";
import { MetricCard } from "@/components/dashboard/metric-card";
import { StatusChip } from "@/components/app/status-chip";
import { EmptyState } from "@/components/app/empty-state";
import { ActivityTimeline } from "@/components/app/activity-timeline";
import { WorkspaceShell } from "@/components/app/workspace-shell";
import { getServerSessionOrRedirect } from "@/lib/auth/server";
import { getDashboardData, getTenantIdFromSession } from "@/lib/data/app-dashboard";

export default async function AppDashboardPage() {
  const session = await getServerSessionOrRedirect();
  const tenantId = getTenantIdFromSession(session);
  if (!tenantId) return null;

  const data = await getDashboardData(tenantId);
  const verificationByState = data.verifications.reduce<Record<string, number>>((acc, item) => {
    acc[item.state] = (acc[item.state] ?? 0) + 1;
    return acc;
  }, {});

  const apiSuccess = data.apiRequests.filter((request) => request.outcome === "SUCCESS").length;
  const apiTotal = data.apiRequests.length;
  const avgLatency =
    apiTotal > 0 ? Math.round(data.apiRequests.reduce((sum, item) => sum + item.latencyMs, 0) / apiTotal) : 0;
  const riskTier = data.trustScore
    ? data.trustScore.score >= 75
      ? "LOW"
      : data.trustScore.score >= 45
        ? "MEDIUM"
        : "HIGH"
    : "HIGH";

  return (
    <WorkspaceShell title="Dashboard" subtitle="Trust posture, verifications, activity, and API health in one place.">
      <div className="space-y-4">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Verification Records" value={String(data.verifications.length)} footer="Latest seeded + live records" />
        <MetricCard title="Signed Actions" value={String(data.signedActions.length)} footer="Cryptographically verifiable actions" />
        <MetricCard title="Audit Events" value={String(data.auditLogs.length)} footer="Recent compliance trail" />
        <MetricCard title="Active Risk Signals" value={String(data.riskSignals.filter((signal) => signal.isActive).length)} footer="Signals needing attention" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <h2 className="text-lg font-semibold">Trust Score</h2>
          <p className="mt-1 text-sm text-slate-600">Current tenant-level trust posture snapshot.</p>
          {data.trustScore ? (
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <p className="text-4xl font-semibold">{data.trustScore.score}</p>
                <div className="flex items-center gap-2">
                  <StatusChip value={data.trustScore.tier} />
                  <StatusChip value={`risk_${riskTier}`} />
                </div>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Calculated {new Date(data.trustScore.calculatedAt).toLocaleString()}
              </p>
              <div className="mt-4 h-2 rounded-full bg-slate-200">
                <div className="h-2 rounded-full bg-slate-900" style={{ width: `${Math.min(100, data.trustScore.score)}%` }} />
              </div>
              {data.trustScore.reasonCodes.length > 0 ? (
                <ul className="mt-4 space-y-1.5">
                  {data.trustScore.reasonCodes.slice(0, 4).map((reason) => (
                    <li key={reason} className="text-xs text-slate-600">
                      - {reason}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : (
            <div className="mt-4">
              <EmptyState title="No trust score yet" message="Trust score appears when verification and risk pipelines run." />
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold">Verification Statuses</h2>
          <p className="mt-1 text-sm text-slate-600">Distribution across latest verification records.</p>
          <ul className="mt-4 space-y-2">
            {Object.entries(verificationByState).length === 0 ? (
              <li className="text-sm text-slate-500">No verification records available.</li>
            ) : (
              Object.entries(verificationByState).map(([state, count]) => (
                <li key={state} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <StatusChip value={state} />
                  <span className="text-sm font-medium text-slate-900">{count}</span>
                </li>
              ))
            )}
          </ul>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card className="min-h-[280px]">
          <h2 className="text-lg font-semibold">Recent Signed Actions</h2>
          <p className="mt-1 text-sm text-slate-600">Latest action signatures produced by users and agents.</p>
          {data.signedActions.length === 0 ? (
            <div className="mt-4">
              <EmptyState title="No signed actions" message="Action signatures will show up here as soon as actions are performed." />
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600">
                    <th className="px-2 py-2">Action</th>
                    <th className="px-2 py-2">Resource</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {data.signedActions.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100">
                      <td className="px-2 py-2 font-medium">{item.actionType}</td>
                      <td className="px-2 py-2 text-slate-600">
                        {item.resourceType}:{item.resourceId}
                      </td>
                      <td className="px-2 py-2">
                        <StatusChip value={item.verificationStatus} />
                      </td>
                      <td className="px-2 py-2 text-slate-600">{new Date(item.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="min-h-[280px]">
          <h2 className="text-lg font-semibold">Recent Audit Activity</h2>
          <p className="mt-1 text-sm text-slate-600">Tamper-evident trail of high-value operations.</p>
          <div className="mt-4">
            <ActivityTimeline
              items={data.auditLogs.slice(0, 8).map((item) => ({
                id: item.id,
                title: `${item.actionType} on ${item.resourceType}`,
                subtitle: item.resourceId ? `Resource: ${item.resourceId}` : undefined,
                timestamp: item.createdAt,
                status: item.outcome,
              }))}
            />
          </div>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card>
          <h2 className="text-lg font-semibold">Linked Identities</h2>
          <p className="mt-1 text-sm text-slate-600">Connected identity providers in your tenant.</p>
          {data.identityLinks.length === 0 ? (
            <div className="mt-4">
              <EmptyState title="No linked identities" message="Connect email, OAuth, or wallet providers to enrich trust decisions." />
            </div>
          ) : (
            <ul className="mt-4 space-y-2">
              {data.identityLinks.map((item) => (
                <li key={item.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-900">{item.user?.name ?? item.user?.email ?? "Unknown user"}</p>
                    <StatusChip value={item.provider} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{item.providerEmail ?? "No provider email"}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold">Connected Organizations</h2>
          <p className="mt-1 text-sm text-slate-600">Organizations scoped under this tenant.</p>
          {data.organizations.length === 0 ? (
            <div className="mt-4">
              <EmptyState title="No organizations yet" message="Create organizations to group users, agents, domains, and API keys." />
            </div>
          ) : (
            <ul className="mt-4 space-y-2">
              {data.organizations.map((org) => (
                <li key={org.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-900">{org.name}</p>
                    <StatusChip value={org.status} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{org.members.length} members · {org.domains.length} domains</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold">API Usage Summary</h2>
          <p className="mt-1 text-sm text-slate-600">Current period request health snapshot.</p>
          {apiTotal === 0 ? (
            <div className="mt-4">
              <EmptyState title="No API requests yet" message="Requests and latency trends will populate after API traffic starts." />
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Requests</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{apiTotal}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Success rate</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">
                  {Math.round((apiSuccess / Math.max(apiTotal, 1)) * 100)}%
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Avg latency</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{avgLatency} ms</p>
              </div>
            </div>
          )}
        </Card>
      </section>
      </div>
    </WorkspaceShell>
  );
}
