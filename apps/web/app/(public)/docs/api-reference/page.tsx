import { AsymmetricShell } from "@/components/marketing/asymmetric-shell";
import { SpotlightCard } from "@/components/ui/spotlight-card";

const endpoints = [
  "POST /v1/auth/login",
  "POST /v1/subjects",
  "POST /v1/verifications",
  "POST /v1/organizations",
  "POST /v1/organizations/:orgId/domains/challenges",
  "POST /v1/organizations/:orgId/agents",
  "POST /v1/developer/api-keys",
  "POST /v1/developer/trust-check",
  "POST /v1/reviews/cases/:id/decision",
];

export default function ApiReferencePage() {
  return (
    <AsymmetricShell
      className="pt-24 pb-16"
      rail={
        <SpotlightCard className="rounded-3xl border border-slate-200 bg-white p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">API Reference</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Internet Passport API</h1>
          <p className="mt-3 text-sm text-slate-600">
            Live spec is available at <span className="font-mono">GET /v1/openapi.json</span>.
          </p>
        </SpotlightCard>
      }
    >
      <SpotlightCard className="rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-slate-900">Common cURL examples</h2>
        <div className="mt-4 space-y-3">
          <pre className="overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">{`# Login
curl -X POST "http://localhost:4000/v1/auth/login" \\
  -H "content-type: application/json" \\
  -d '{"email":"founder@internetpassport.dev","password":"ChangeMe123!"}'`}</pre>
          <pre className="overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">{`# Trust check with API key
curl -X POST "http://localhost:4000/v1/developer/trust-check" \\
  -H "x-api-key: $API_KEY" \\
  -H "content-type: application/json" \\
  -d '{"targetType":"user","targetId":"user_123"}'`}</pre>
          <pre className="overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">{`# Health checks
curl "http://localhost:4000/health"
curl "http://localhost:4000/v1/health"`}</pre>
        </div>
      </SpotlightCard>

      <SpotlightCard className="mt-4 rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-slate-900">Core endpoints</h2>
        <ul className="mt-3 grid gap-2 md:grid-cols-2">
          {endpoints.map((endpoint) => (
            <li key={endpoint} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700">
              {endpoint}
            </li>
          ))}
        </ul>
      </SpotlightCard>
    </AsymmetricShell>
  );
}
