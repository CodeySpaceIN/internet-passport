import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/app/empty-state";
import { StatusChip } from "@/components/app/status-chip";
import { WorkspaceShell } from "@/components/app/workspace-shell";
import { getServerSessionOrRedirect } from "@/lib/auth/server";
import { getTenantIdFromSession } from "@/lib/data/app-dashboard";
import { prisma } from "@internet-passport/db";
import { startVerificationFlowAction } from "./actions";

const verificationModules = [
  {
    id: "email_verification",
    title: "Email Verification",
    description: "Confirm mailbox ownership and continuity signals.",
  },
  {
    id: "human_verification",
    title: "Human Verification",
    description: "Run anti-bot and liveness style trust checks.",
  },
  {
    id: "phone_verification_placeholder",
    title: "Phone Verification (Placeholder)",
    description: "Reserved flow for OTP provider integration.",
  },
  {
    id: "github_identity_verification",
    title: "GitHub Identity",
    description: "Validate linked developer account provenance.",
  },
  {
    id: "organization_domain_verification",
    title: "Organization Domain",
    description: "Prove control over business domain records.",
  },
  {
    id: "ai_agent_registration",
    title: "AI Agent Registration",
    description: "Register and attest agent policy ownership.",
  },
] as const;

function normalizeStatus(state: string) {
  if (state === "PASSED") return "verified";
  if (state === "FAILED") return "failed";
  if (state === "REJECTED") return "rejected";
  if (state === "NEEDS_REVIEW") return "needs_review";
  return "pending";
}

export default async function VerificationsPage() {
  const session = await getServerSessionOrRedirect();
  const tenantId = getTenantIdFromSession(session);
  if (!tenantId) return null;

  const [verifications, auditHistory, trustScores] = await Promise.all([
    prisma.verificationRecord.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
        organization: { select: { id: true, name: true } },
        agent: { select: { id: true, displayName: true } },
      },
      take: 60,
    }),
    prisma.auditLog.findMany({
      where: { tenantId, resourceType: "VerificationRecord" },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.trustScore.findMany({
      where: { tenantId, isCurrent: true },
      orderBy: { calculatedAt: "desc" },
      take: 200,
    }),
  ]);
  const total = verifications.length;
  const verifiedCount = verifications.filter((item) => item.state === "PASSED").length;
  const failedCount = verifications.filter((item) => item.state === "FAILED" || item.state === "REJECTED").length;
  const reviewCount = verifications.filter((item) => item.state === "NEEDS_REVIEW").length;

  return (
    <WorkspaceShell
      title="Verification Center"
      subtitle="Start verification flows, monitor outcomes, and track trust score impact."
    >
      <section className="grid gap-4 md:grid-cols-4">
        <Card>
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Total</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{total}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Verified</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{verifiedCount}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Failed / Rejected</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{failedCount}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Needs Review</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{reviewCount}</p>
        </Card>
      </section>

      <Card className="mt-4">
        <h2 className="text-xl font-semibold">Start Verification Flow</h2>
        <p className="mt-1 text-sm text-slate-600">
          Provider adapters are abstracted; these actions currently run against realistic mock providers.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {verificationModules.map((module) => (
            <form key={module.id} action={startVerificationFlowAction} className="rounded-xl border border-slate-200 bg-white p-3">
              <input type="hidden" name="module" value={module.id} />
              <p className="text-sm font-semibold text-slate-900">{module.title}</p>
              <p className="mt-1 text-xs text-slate-600">{module.description}</p>
              <input
                name="targetHint"
                placeholder="Target label (optional)"
                className="mt-3 w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-700"
              />
              <input
                name="details"
                placeholder="Context details (optional)"
                className="mt-2 w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-700"
              />
              <button
                type="submit"
                className="mt-3 inline-flex w-full items-center justify-center rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-slate-800"
              >
                Start flow
              </button>
            </form>
          ))}
        </div>
      </Card>

      <Card className="mt-4">
        <h2 className="text-xl font-semibold">Verification History</h2>
        <p className="mt-1 text-sm text-slate-600">Statuses supported: pending, verified, failed, rejected, needs_review.</p>
        {verifications.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="No verification records"
              message="Run any module above to create your first verification flow."
            />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="px-2 py-2">Module Type</th>
                  <th className="px-2 py-2">Subject</th>
                  <th className="px-2 py-2">Provider</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Confidence</th>
                  <th className="px-2 py-2">Trust Tier</th>
                  <th className="px-2 py-2">Updated</th>
                </tr>
              </thead>
              <tbody>
                {verifications.map((item) => {
                  const subject =
                    item.user?.name ??
                    item.user?.email ??
                    item.organization?.name ??
                    item.agent?.displayName ??
                    "Unknown";
                  const trust = trustScores.find((score) => score.verificationRecordId === item.id);
                  return (
                    <tr key={item.id} className="border-b border-slate-100">
                      <td className="px-2 py-2 font-medium">{item.verificationType}</td>
                      <td className="px-2 py-2 text-slate-700">{subject}</td>
                      <td className="px-2 py-2 text-slate-700">{item.provider}</td>
                      <td className="px-2 py-2">
                        <StatusChip value={normalizeStatus(item.state)} />
                      </td>
                      <td className="px-2 py-2 text-slate-700">
                        {item.confidenceScore !== null && item.confidenceScore !== undefined
                          ? `${Math.round(item.confidenceScore * 100)}%`
                          : "-"}
                      </td>
                      <td className="px-2 py-2 text-slate-700">{trust?.tier ?? "-"}</td>
                      <td className="px-2 py-2 text-slate-600">{new Date(item.updatedAt).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="mt-4">
        <h2 className="text-xl font-semibold">Audit Trail</h2>
        <p className="mt-1 text-sm text-slate-600">Major verification events are logged for review and forensics.</p>
        {auditHistory.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="No verification audit events" message="Verification actions will create audit records here." />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th className="px-2 py-2">Action</th>
                <th className="px-2 py-2">Resource</th>
                <th className="px-2 py-2">Outcome</th>
                <th className="px-2 py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {auditHistory.map((item) => {
                return (
                  <tr key={item.id} className="border-b border-slate-100">
                    <td className="px-2 py-2 font-medium">{item.actionType}</td>
                    <td className="px-2 py-2 text-slate-700">
                      {item.resourceType}:{item.resourceId ?? "-"}
                    </td>
                    <td className="px-2 py-2">
                      <StatusChip value={item.outcome} />
                    </td>
                    <td className="px-2 py-2 text-slate-600">{new Date(item.createdAt).toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        )}
      </Card>
    </WorkspaceShell>
  );
}
