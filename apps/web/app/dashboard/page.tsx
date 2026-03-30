import { getServerSessionOrRedirect } from "@/lib/auth/server";
import { prisma } from "@internet-passport/db";
import { Card } from "@/components/ui/card";
import { MetricCard } from "@/components/dashboard/metric-card";
import { MiniLineChart } from "@/components/dashboard/mini-line-chart";
import { AppShell } from "@/components/layout/app-shell";

export default async function DashboardPage() {
  const session = await getServerSessionOrRedirect();

  const tenantId = session.user.memberships[0]?.tenantId;
  const trustDecisions = tenantId
    ? await prisma.trustDecision.findMany({
        where: { tenantId },
        include: {
          subject: {
            select: {
              displayName: true,
              subjectType: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      })
    : [];

  const decisionBuckets = trustDecisions.reduce<Record<string, number>>((acc, item) => {
    acc[item.decision] = (acc[item.decision] ?? 0) + 1;
    return acc;
  }, {});
  const allowCount = decisionBuckets.ALLOW ?? 0;
  const reviewCount = decisionBuckets.REVIEW ?? 0;
  const denyCount = decisionBuckets.DENY ?? 0;
  const trendPoints = trustDecisions
    .slice(0, 8)
    .reverse()
    .map((item) => {
      if (item.decision === "ALLOW") return 90;
      if (item.decision === "REVIEW") return 60;
      return 30;
    });
  const decisionClasses: Record<string, string> = {
    ALLOW: "bg-emerald-100/70 text-emerald-700 dark:bg-emerald-900/35 dark:text-emerald-300",
    REVIEW: "bg-amber-100/70 text-amber-700 dark:bg-amber-900/35 dark:text-amber-300",
    DENY: "bg-rose-100/70 text-rose-700 dark:bg-rose-900/35 dark:text-rose-300",
  };

  return (
    <AppShell
      heading={`Good afternoon, ${session.user.name ?? "Operator"}!`}
      subheading="All zones and teams."
      activeNav="Dashboard"
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Trust Decisions" value={String(trustDecisions.length)} delta="+12% this week" />
        <MetricCard title="Approved" value={String(allowCount)} footer="High-confidence automated approvals" />
        <MetricCard title="Needs Review" value={String(reviewCount)} footer="Pending manual verification" />
        <MetricCard title="Denied" value={String(denyCount)} footer="Policy-blocked or risky actions" />
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-[1.7fr_0.9fr]">
        <Card className="p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Trust Health</h2>
              <p className="text-xs text-muted">Monthly signal trend</p>
            </div>
            <p className="rounded-lg border border-card-border bg-background/70 px-2.5 py-1 text-[11px] font-medium text-muted">
              This month
            </p>
          </div>
          <MiniLineChart points={trendPoints.length > 0 ? trendPoints : [50, 52, 48, 56, 62, 58, 63, 60]} />
        </Card>

        <Card className="p-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">Operator Profile</h2>
            <p className="text-[11px] font-medium text-muted">Live</p>
          </div>
          <p className="text-sm text-muted">Scoped to your current memberships</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {session.user.roles.map((role) => (
              <span
                key={role}
                className="rounded-full border border-card-border bg-background/70 px-3 py-1 text-xs uppercase tracking-wide text-foreground/80"
              >
                {role}
              </span>
            ))}
          </div>
          <p className="mt-6 text-sm text-foreground/90">{session.user.email}</p>
          <p className="mt-1 text-xs text-muted">User ID: {session.user.id}</p>
        </Card>
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="min-h-[330px] p-5">
          <h2 className="text-xl font-semibold text-foreground">Recent Trust Decisions</h2>
          <p className="mt-1 text-sm text-muted">Latest policy outcomes across subjects and actions</p>
          {trustDecisions.length === 0 ? (
            <p className="mt-5 text-sm text-muted">No trust decisions recorded yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-card-border text-muted">
                    <th className="px-2 py-2.5 font-medium">Time</th>
                    <th className="px-2 py-2.5 font-medium">Subject</th>
                    <th className="px-2 py-2.5 font-medium">Context</th>
                    <th className="px-2 py-2.5 font-medium">Action</th>
                    <th className="px-2 py-2.5 font-medium">Decision</th>
                  </tr>
                </thead>
                <tbody>
                  {trustDecisions.map((item) => (
                    <tr key={item.id} className="border-b border-card-border/70 last:border-0">
                      <td className="px-2 py-3 text-muted">{new Date(item.createdAt).toLocaleString()}</td>
                      <td className="px-2 py-3 text-foreground">
                        {item.subject.displayName} ({item.subject.subjectType})
                      </td>
                      <td className="px-2 py-3 text-foreground/85">{item.contextType}</td>
                      <td className="px-2 py-3 text-foreground/85">{item.actionType}</td>
                      <td className="px-2 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            decisionClasses[item.decision] ?? "bg-background text-foreground/80"
                          }`}
                        >
                          {item.decision}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <Card className="min-h-[330px] p-5">
          <h2 className="text-xl font-semibold text-foreground">Top Signals</h2>
          <p className="mt-1 text-sm text-muted">Current operational watchlist</p>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex items-center justify-between rounded-xl border border-card-border bg-background/70 px-3 py-2.5">
              <span className="text-foreground/85">Velocity anomaly checks</span>
              <span className="font-semibold text-foreground">{reviewCount + 3}</span>
            </li>
            <li className="flex items-center justify-between rounded-xl border border-card-border bg-background/70 px-3 py-2.5">
              <span className="text-foreground/85">Domain spoofing checks</span>
              <span className="font-semibold text-foreground">{denyCount + 1}</span>
            </li>
            <li className="flex items-center justify-between rounded-xl border border-card-border bg-background/70 px-3 py-2.5">
              <span className="text-foreground/85">Manual reviewer queue</span>
              <span className="font-semibold text-foreground">{reviewCount}</span>
            </li>
          </ul>
        </Card>
      </section>
    </AppShell>
  );
}
