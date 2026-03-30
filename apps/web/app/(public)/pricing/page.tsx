import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SpotlightCard } from "@/components/ui/spotlight-card";

const tiers = [
  {
    name: "Starter",
    intro: "For teams shipping first trust workflows.",
    fit: "Early-stage teams",
    features: ["Core verification records", "API key issuance and rotation", "Baseline risk signals"],
    accent: "border-emerald-200 bg-emerald-100 text-emerald-800",
    tone: "border-emerald-200 bg-emerald-50/70",
    cta: "Start with starter",
  },
  {
    name: "Growth",
    intro: "For products scaling verification and review volume.",
    fit: "Scaling platforms",
    features: ["Advanced scoring inputs", "Review queue workflows", "Signed actions and audit exports"],
    accent: "border-orange-200 bg-orange-100 text-orange-800",
    tone: "border-orange-200 bg-orange-50/70",
    cta: "Talk about growth",
    highlighted: true,
  },
  {
    name: "Enterprise",
    intro: "For regulated and high-assurance environments.",
    fit: "High-assurance orgs",
    features: ["Custom deployment topology", "Policy and governance controls", "Priority enablement support"],
    accent: "border-sky-200 bg-sky-100 text-sky-800",
    tone: "border-sky-200 bg-sky-50/70",
    cta: "Contact enterprise",
  },
];

const faqs = [
  {
    q: "How is pricing determined?",
    a: "Pricing is scoped to trust volume, workflow complexity, and deployment requirements.",
  },
  {
    q: "Can we upgrade later?",
    a: "Yes. Teams can start with a narrow integration and expand as usage grows.",
  },
  {
    q: "Do you support enterprise procurement?",
    a: "Yes. Security review, legal review, and architecture alignment are supported.",
  },
];

export default function PricingPage() {
  return (
    <main className="relative w-full overflow-hidden px-6 pb-24 pt-24 lg:px-10 xl:px-14">
      <section className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[1.2fr_minmax(320px,1fr)]">
        <SpotlightCard className="terminal-panel rounded-3xl border border-slate-200 bg-white p-7 lg:p-9">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-slate-600">
            <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
            Pricing
          </div>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-slate-900 lg:text-5xl">
            Modern trust plans for products at every stage
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-600 lg:text-base">
            Pick a plan based on operational complexity, review workflows, and governance depth.
            Move from baseline verification to policy-driven trust orchestration as you grow.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-800">
              Usage aligned
            </span>
            <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs text-sky-800">
              Security first
            </span>
            <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs text-violet-800">
              No fake line-item pricing
            </span>
          </div>
        </SpotlightCard>

        <SpotlightCard className="terminal-panel rounded-3xl border border-slate-200 bg-white p-6">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">What changes by tier</p>
          <div className="mt-4 space-y-3">
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <Workflow className="mt-0.5 h-4 w-4 text-emerald-700" />
              <div>
                <p className="text-sm font-medium text-slate-900">Workflow depth</p>
                <p className="mt-1 text-xs text-slate-600">From simple checks to full review lifecycle.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 p-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 text-orange-700" />
              <div>
                <p className="text-sm font-medium text-slate-900">Governance controls</p>
                <p className="mt-1 text-xs text-slate-600">Policy, auditability, and deployment posture.</p>
              </div>
            </div>
          </div>
          <Link href={"/signup" as Route} className="mt-5 block">
            <Button className="w-full">
              Schedule onboarding
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </SpotlightCard>
      </section>

      <section className="mx-auto mt-10 grid max-w-6xl gap-4 lg:grid-cols-3">
        {tiers.map((tier) => (
          <SpotlightCard
            key={tier.name}
            className={`terminal-panel flex h-full flex-col rounded-3xl border p-6 ${tier.tone}`}
          >
            <div className="flex items-center justify-between">
              <p className="text-xl font-semibold text-slate-900">{tier.name}</p>
              <span className={`rounded-full border px-2.5 py-1 text-[11px] ${tier.accent}`}>
                {tier.fit}
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">{tier.intro}</p>
            <ul className="mt-6 space-y-3 text-sm text-slate-700">
              {tier.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  {feature}
                </li>
              ))}
            </ul>
            <Link href={"/signup" as Route} className="mt-auto block pt-6">
              <Button className="w-full" variant={tier.highlighted ? "default" : "outline"}>
                {tier.cta}
              </Button>
            </Link>
          </SpotlightCard>
        ))}
      </section>

      <section className="mx-auto mt-10 grid max-w-6xl gap-4 lg:grid-cols-[1.2fr_1fr]">
        <SpotlightCard className="terminal-panel rounded-3xl border border-slate-200 bg-white p-6 lg:p-7">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Common questions</p>
          <div className="mt-4 space-y-4">
            {faqs.map((item) => (
              <div key={item.q} className="border-b border-slate-200 pb-4 last:border-0 last:pb-0">
                <p className="text-sm font-medium text-slate-900">{item.q}</p>
                <p className="mt-2 text-sm text-slate-600">{item.a}</p>
              </div>
            ))}
          </div>
        </SpotlightCard>

        <SpotlightCard className="terminal-panel rounded-3xl border border-violet-200 bg-violet-50/70 p-6 lg:p-7">
          <p className="text-xs uppercase tracking-[0.2em] text-violet-700">Enterprise</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">Need a tailored scope?</h2>
          <p className="mt-3 text-sm text-slate-600">
            We map deployment, governance, and rollout around your compliance posture and internal
            approval flow.
          </p>
          <Link href={"/signup" as Route} className="mt-6 inline-block">
            <Button>
              Talk to sales
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </SpotlightCard>
      </section>
    </main>
  );
}
