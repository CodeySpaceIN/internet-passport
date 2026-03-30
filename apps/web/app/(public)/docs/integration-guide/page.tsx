import { AsymmetricShell } from "@/components/marketing/asymmetric-shell";
import { SpotlightCard } from "@/components/ui/spotlight-card";

export default function IntegrationGuidePage() {
  return (
    <AsymmetricShell
      className="pt-24 pb-16"
      rail={
        <SpotlightCard className="rounded-3xl border border-slate-200 bg-white p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Integration Guide</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Ship in one afternoon</h1>
          <p className="mt-3 text-sm text-slate-600">
            This is an implementation blueprint for onboarding, trust checks, and admin review fallback.
          </p>
        </SpotlightCard>
      }
    >
      <SpotlightCard className="rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-slate-900">Step 1: Create API key</h2>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">{`curl -X POST "http://localhost:4000/v1/developer/api-keys" \\
  -H "authorization: Bearer $ACCESS_TOKEN" \\
  -H "content-type: application/json" \\
  -d '{"name":"checkout-service","scopes":["trust:read","trust:check","actions:verify"]}'`}</pre>
      </SpotlightCard>

      <SpotlightCard className="mt-4 rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-slate-900">Step 2: Call trust-check before sensitive action</h2>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">{`curl -X POST "http://localhost:4000/v1/developer/trust-check" \\
  -H "x-api-key: $API_KEY" \\
  -H "content-type: application/json" \\
  -d '{"targetType":"user","targetId":"usr_abc123","contextType":"checkout","actionType":"payment_authorize"}'`}</pre>
        <p className="mt-3 text-sm text-slate-600">
          Use returned `trustTier` + `riskTier` to decide allow / step-up / deny in your application policy layer.
        </p>
      </SpotlightCard>

      <SpotlightCard className="mt-4 rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-slate-900">Step 3: Send review decision for flagged cases</h2>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">{`curl -X POST "http://localhost:4000/v1/reviews/cases/$CASE_ID/decision" \\
  -H "authorization: Bearer $ACCESS_TOKEN" \\
  -H "content-type: application/json" \\
  -d '{"decision":"APPROVE","rationale":"Validated with additional evidence"}'`}</pre>
      </SpotlightCard>

      <SpotlightCard className="mt-4 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6">
        <h2 className="text-lg font-semibold text-slate-900">Operational checklist</h2>
        <ul className="mt-2 space-y-1 text-sm text-slate-700">
          <li>- Rotate API keys every 90 days or less.</li>
          <li>- Require `x-idempotency-key` for retried write requests.</li>
          <li>- Monitor `/v1/health` and alert on DB connectivity degradation.</li>
          <li>- Keep admin review queues near zero backlog.</li>
        </ul>
      </SpotlightCard>
    </AsymmetricShell>
  );
}
