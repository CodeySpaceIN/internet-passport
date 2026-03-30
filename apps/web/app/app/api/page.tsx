import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/app/empty-state";
import { StatusChip } from "@/components/app/status-chip";
import { WorkspaceShell } from "@/components/app/workspace-shell";
import { DeveloperApiManager } from "@/components/app/developer-api-manager";
import { getServerSessionOrRedirect } from "@/lib/auth/server";
import { getApiData, getTenantIdFromSession } from "@/lib/data/app-dashboard";

export default async function ApiPage() {
  const session = await getServerSessionOrRedirect();
  const tenantId = getTenantIdFromSession(session);
  if (!tenantId) return null;

  const { apiKeys, requests, organizations } = await getApiData(tenantId);
  const requestTotal = requests.length;
  const successCount = requests.filter((item) => item.outcome === "SUCCESS").length;
  const avgLatency = requestTotal > 0 ? Math.round(requests.reduce((acc, item) => acc + item.latencyMs, 0) / requestTotal) : 0;

  return (
    <WorkspaceShell title="API" subtitle="Inspect keys, request outcomes, and usage patterns.">
      <div className="space-y-4">
      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Total requests</p>
          <p className="mt-2 text-3xl font-semibold">{requestTotal}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Success rate</p>
          <p className="mt-2 text-3xl font-semibold">
            {requestTotal > 0 ? `${Math.round((successCount / requestTotal) * 100)}%` : "0%"}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Avg latency</p>
          <p className="mt-2 text-3xl font-semibold">{avgLatency}ms</p>
        </Card>
      </section>

      <Card>
        <h2 className="text-xl font-semibold">API Usage Summary</h2>
        <p className="mt-1 text-sm text-slate-600">
          Developer API is ready for integrations with API key auth, trust checks, and signed-action validation.
        </p>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">OpenAPI</p>
            <p className="mt-2 font-mono text-xs text-slate-700">GET /v1/openapi.json</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Response envelope</p>
            <p className="mt-2 font-mono text-xs text-slate-700">{"{ success, data, error, meta }"}</p>
          </div>
        </div>
      </Card>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <h3 className="text-lg font-semibold">API Keys</h3>
          <div className="mt-4">
            <DeveloperApiManager
              apiKeys={apiKeys.map((item) => ({
                id: item.id,
                name: item.name,
                keyPrefix: item.keyPrefix,
                scopes: item.scopes,
                status: item.status,
                lastUsedAt: item.lastUsedAt,
                createdAt: item.createdAt,
                organizationId: item.organizationId,
              }))}
              organizations={organizations}
            />
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold">Recent Requests</h3>
          {requests.length === 0 ? (
            <div className="mt-4">
              <EmptyState title="No API request logs" message="Request logs will appear once integrations begin sending traffic." />
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600">
                    <th className="px-2 py-2">Method</th>
                    <th className="px-2 py-2">Path</th>
                    <th className="px-2 py-2">Outcome</th>
                    <th className="px-2 py-2">Latency</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.slice(0, 20).map((request) => (
                    <tr key={request.id} className="border-b border-slate-100">
                      <td className="px-2 py-2 font-medium">{request.method}</td>
                      <td className="px-2 py-2 text-slate-700">{request.path}</td>
                      <td className="px-2 py-2">
                        <StatusChip value={request.outcome} />
                      </td>
                      <td className="px-2 py-2 text-slate-700">{request.latencyMs} ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>

      <Card>
        <h3 className="text-lg font-semibold">Example cURL snippets</h3>
        <div className="mt-4 space-y-3">
          <pre className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-950 p-3 text-xs text-slate-100">{`curl -X POST "http://localhost:4000/v1/developer/trust-check" \\
  -H "x-api-key: $API_KEY" \\
  -H "content-type: application/json" \\
  -d '{"targetType":"user","targetId":"user_123"}'`}</pre>
          <pre className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-950 p-3 text-xs text-slate-100">{`curl "http://localhost:4000/v1/developer/trust/users/user_123/summary" \\
  -H "x-api-key: $API_KEY"`}</pre>
          <pre className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-950 p-3 text-xs text-slate-100">{`curl -X POST "http://localhost:4000/v1/developer/signed-actions/validate" \\
  -H "x-api-key: $API_KEY" \\
  -H "content-type: application/json" \\
  -d '{"actionId":"act_123","payload":{"orderId":"ord_1"}}'`}</pre>
        </div>
      </Card>
      </div>
    </WorkspaceShell>
  );
}
