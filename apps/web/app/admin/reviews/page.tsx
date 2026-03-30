import { AdminTableCard } from "@/components/admin/admin-table-card";
import { StatusChip } from "@/components/app/status-chip";
import { EmptyState } from "@/components/app/empty-state";
import { requirePermission } from "@/lib/auth/server";
import { getTenantIdFromSession } from "@/lib/data/app-dashboard";
import { getReviewQueueData } from "@/lib/data/admin-console";
import { submitReviewDecisionAction, transitionReviewCaseAction } from "../actions";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function AdminReviewsPage({ searchParams }: PageProps) {
  const session = await requirePermission("admin:access");
  const tenantId = getTenantIdFromSession(session);
  if (!tenantId) return null;

  const params = (await searchParams) ?? {};
  const status = readParam(params, "status") || "ALL";
  const query = readParam(params, "q");
  const page = Math.max(1, Number(readParam(params, "page") || "1"));

  const data = await getReviewQueueData(tenantId, { status, query, page, pageSize: 20 });

  return (
    <AdminTableCard title="Review cases" description="Filter by status and search by case type or subject.">
        <form method="GET" className="mb-3 grid gap-2 md:grid-cols-[220px_1fr_auto]">
          <select name="status" defaultValue={status} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
            <option value="ALL">All statuses</option>
            <option value="OPEN">OPEN</option>
            <option value="IN_REVIEW">IN_REVIEW</option>
            <option value="DECIDED">DECIDED</option>
            <option value="CLOSED">CLOSED</option>
          </select>
          <input name="q" defaultValue={query} placeholder="Search case type or subject" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
          <button type="submit" className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white">
            Apply
          </button>
        </form>

        {data.items.length === 0 ? (
          <EmptyState
            title="No review cases"
            message="Try broadening the filters or wait for new verification anomalies."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="px-2 py-2">Case</th>
                  <th className="px-2 py-2">Subject</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Priority</th>
                  <th className="px-2 py-2">Opened</th>
                  <th className="px-2 py-2">Transition</th>
                  <th className="px-2 py-2">Decision</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 align-top">
                <td className="px-2 py-2">
                  <p className="font-medium text-slate-900">{item.caseType}</p>
                  <p className="text-xs text-slate-500">{item.id}</p>
                </td>
                <td className="px-2 py-2">
                  <p className="text-slate-800">{item.subject.displayName}</p>
                  <p className="text-xs text-slate-500">{item.subject.subjectType}</p>
                </td>
                <td className="px-2 py-2">
                  <StatusChip value={item.status} />
                </td>
                <td className="px-2 py-2">
                  <StatusChip value={item.priority} />
                </td>
                <td className="px-2 py-2 text-slate-600">{new Date(item.openedAt).toLocaleString()}</td>
                <td className="px-2 py-2">
                  <form action={transitionReviewCaseAction} className="space-y-1">
                    <input type="hidden" name="reviewCaseId" value={item.id} />
                    <select name="nextStatus" defaultValue={item.status} className="rounded border border-slate-300 px-2 py-1 text-xs">
                      <option value="OPEN">OPEN</option>
                      <option value="IN_REVIEW">IN_REVIEW</option>
                      <option value="DECIDED">DECIDED</option>
                      <option value="CLOSED">CLOSED</option>
                    </select>
                    <input name="note" placeholder="Admin note" className="block w-full rounded border border-slate-300 px-2 py-1 text-xs" />
                    <button type="submit" className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700">
                      Update
                    </button>
                  </form>
                </td>
                <td className="px-2 py-2">
                  <form action={submitReviewDecisionAction} className="space-y-1">
                    <input type="hidden" name="reviewCaseId" value={item.id} />
                    <select name="decision" defaultValue="APPROVE" className="rounded border border-slate-300 px-2 py-1 text-xs">
                      <option value="APPROVE">APPROVE</option>
                      <option value="REJECT">REJECT</option>
                      <option value="ESCALATE">ESCALATE</option>
                    </select>
                    <input name="rationale" placeholder="Decision rationale" className="block w-full rounded border border-slate-300 px-2 py-1 text-xs" />
                    <button type="submit" className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700">
                      Submit
                    </button>
                  </form>
                </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </AdminTableCard>
  );
}
