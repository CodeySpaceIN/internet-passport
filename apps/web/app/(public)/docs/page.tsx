import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, BookOpenText, Code2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { AsymmetricShell } from "@/components/marketing/asymmetric-shell";

const docSections = [
  {
    title: "Quickstart",
    description: "Set up auth, API keys, and your first trust evaluation with a guided workflow.",
    icon: BookOpenText,
    tone: "border-emerald-200 bg-emerald-50/70",
    iconTone: "border-emerald-200 bg-emerald-100 text-emerald-700",
  },
  {
    title: "API Reference",
    description: "Explore endpoints for trust checks, signed action validation, and API-key integrations.",
    icon: Code2,
    tone: "border-sky-200 bg-sky-50/70",
    iconTone: "border-sky-200 bg-sky-100 text-sky-700",
  },
  {
    title: "Integration Guide",
    description: "Follow an end-to-end implementation path from API keys to trust-check and review fallback.",
    icon: Code2,
    tone: "border-amber-200 bg-amber-50/70",
    iconTone: "border-amber-200 bg-amber-100 text-amber-700",
  },
  {
    title: "Security Guide",
    description: "Learn key rotation, audit chaining, and secure integration patterns.",
    icon: Shield,
    tone: "border-violet-200 bg-violet-50/70",
    iconTone: "border-violet-200 bg-violet-100 text-violet-700",
  },
];

export default function DocsPage() {
  return (
    <AsymmetricShell
      className="pt-24 pb-16"
      rail={
        <SpotlightCard className="terminal-panel rounded-3xl border border-slate-200 bg-white p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Documentation</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">Build with confidence</h1>
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            Developer-first docs with practical recipes for trust scoring, verification workflows, and
            signed action handling.
          </p>
          <div className="mt-6 space-y-2 text-sm">
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800">
              Quickstart guides
            </p>
            <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sky-800">
              OpenAPI-first endpoints
            </p>
            <p className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-violet-800">
              Security best practices
            </p>
          </div>
        </SpotlightCard>
      }
    >
      <SpotlightCard className="terminal-panel mb-4 rounded-3xl border border-slate-200 bg-white p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Start Here</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">Choose your implementation path</h2>
        <p className="mt-2 text-sm text-slate-600">
          Pick a track to integrate Internet Passport quickly, then expand with advanced policy and
          governance controls.
        </p>
      </SpotlightCard>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {docSections.map((section) => {
          const Icon = section.icon;
          return (
            <SpotlightCard key={section.title} className={`terminal-panel rounded-3xl border p-6 ${section.tone}`}>
              <div className={`inline-flex rounded-xl border p-2.5 ${section.iconTone}`}>
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">{section.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{section.description}</p>
              {section.title === "API Reference" ? (
                <Link href={"/docs/api-reference" as Route} className="mt-4 inline-flex text-sm font-medium text-slate-800">
                  Open API docs <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              ) : null}
              {section.title === "Integration Guide" ? (
                <Link href={"/docs/integration-guide" as Route} className="mt-4 inline-flex text-sm font-medium text-slate-800">
                  Open guide <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              ) : null}
            </SpotlightCard>
          );
        })}
      </div>

      <SpotlightCard className="terminal-panel mt-4 rounded-3xl border border-slate-200 bg-white p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Developer API</p>
        <h3 className="mt-2 text-xl font-semibold text-slate-900">OpenAPI and cURL examples</h3>
        <p className="mt-2 text-sm text-slate-600">
          SDK-friendly envelopes and API key auth are documented in the live OpenAPI route.
        </p>
        <div className="mt-4 space-y-2">
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700">
            GET /v1/openapi.json
          </p>
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700">
            GET /v1/docs/developer
          </p>
        </div>
      </SpotlightCard>

      <SpotlightCard className="terminal-panel mt-4 rounded-3xl border border-slate-200 bg-white p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Coming next</p>
        <h3 className="mt-2 text-xl font-semibold text-slate-900">SDK tutorials and framework starters</h3>
        <p className="mt-2 text-sm text-slate-600">
          We are publishing reusable SDK guides for Next.js, Node workers, and event-driven trust
          pipelines.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-800">
            Next.js
          </span>
          <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs text-sky-800">
            Node Workers
          </span>
          <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs text-violet-800">
            Webhooks
          </span>
        </div>
        <div className="mt-5">
          <Link href={"/changelog" as Route}>
            <Button variant="outline">
              View changelog
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </SpotlightCard>

      <SpotlightCard className="terminal-panel mt-4 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Empty state preview</p>
        <h4 className="mt-2 text-lg font-semibold text-slate-900">No SDK package selected</h4>
        <p className="mt-2 text-sm text-slate-600">
          Pick a language SDK to view implementation snippets and secure integration defaults.
        </p>
      </SpotlightCard>
    </AsymmetricShell>
  );
}
