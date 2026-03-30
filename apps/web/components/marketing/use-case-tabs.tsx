"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { TrustBadge } from "@/components/marketing/trust-badge";

const useCases = [
  {
    id: "hiring",
    label: "Hiring & Freelance",
    title: "Trust candidate identity before screening",
    description:
      "Filter AI-generated resumes and reduce deepfake interview risk. Verify applicant identity before the first screening decision.",
    bullets: ["Verify candidate account ownership", "Flag suspicious voice/video artifacts", "Attach signed reviewer actions"],
  },
  {
    id: "fintech",
    label: "Fintech & Onboarding",
    title: "Authenticate sessions during high-risk flows",
    description:
      "Bind trust checks to onboarding, account recovery, and transaction approval journeys without exposing unnecessary user identity data.",
    bullets: ["Run liveness and risk checks", "Route high-risk sessions to review", "Keep immutable audit logs"],
  },
  {
    id: "b2b",
    label: "B2B SaaS",
    title: "Authorize humans and agents in product workflows",
    description:
      "Validate who or what triggered critical product actions and enforce cryptographic accountability for support and automation events.",
    bullets: ["Verify operator and agent credentials", "Sign privileged actions", "Expose trust badges in-app"],
  },
  {
    id: "creator",
    label: "Creator Platforms",
    title: "Protect identity, provenance, and community trust",
    description:
      "Authenticate creators, verify content provenance, and reduce impersonation incidents across channels and sponsorship workflows.",
    bullets: ["Verify account authenticity", "Sign media provenance metadata", "Block synthetic impersonation patterns"],
  },
] as const;

export function UseCaseTabs() {
  const [active, setActive] = useState<(typeof useCases)[number]["id"]>("hiring");
  const current = useCases.find((item) => item.id === active) ?? useCases[0];

  return (
    <div className="grid gap-4 lg:grid-cols-[290px_minmax(0,1fr)]">
      <div className="space-y-2">
        {useCases.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActive(item.id)}
            className={`w-full rounded-xl border px-3 py-3 text-left text-sm transition ${
              item.id === active
                ? "border-cyan-400/45 bg-cyan-500/12 text-cyan-200"
                : "border-card-border bg-slate-900/65 text-slate-300 hover:bg-slate-800/70"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <Card className="terminal-panel p-6">
        <TrustBadge label="Active Industry Profile" />
        <h3 className="mt-4 text-2xl font-semibold tracking-tight text-slate-100">{current.title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">{current.description}</p>
        <ul className="mt-4 space-y-2">
          {current.bullets.map((item) => (
            <li key={item} className="text-sm text-slate-200">
              - {item}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
