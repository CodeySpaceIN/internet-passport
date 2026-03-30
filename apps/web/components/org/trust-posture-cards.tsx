import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/app/status-chip";

type TrustPostureCardsProps = {
  score: number | null;
  tier: string | null;
  activeSignals: number;
  verificationPassRate: number;
};

export function TrustPostureCards({ score, tier, activeSignals, verificationPassRate }: TrustPostureCardsProps) {
  const riskTier = score === null ? "high" : score >= 75 ? "low" : score >= 45 ? "medium" : "high";
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card>
        <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Org trust score</p>
        <p className="mt-2 text-3xl font-semibold text-slate-900">{score ?? "-"}</p>
      </Card>
      <Card>
        <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Trust tier</p>
        <div className="mt-2">
          <StatusChip value={tier ?? "untrusted"} />
        </div>
      </Card>
      <Card>
        <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Risk tier</p>
        <div className="mt-2">
          <StatusChip value={riskTier} />
        </div>
        <p className="mt-2 text-xs text-slate-600">{activeSignals} active risk signals</p>
      </Card>
      <Card>
        <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Verification pass rate</p>
        <p className="mt-2 text-3xl font-semibold text-slate-900">{verificationPassRate}%</p>
      </Card>
    </section>
  );
}
