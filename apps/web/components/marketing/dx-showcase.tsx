"use client";

import { Check, Copy } from "lucide-react";
import { useMemo, useState } from "react";

const tabs = ["Next.js", "Python", "Go", "Curl"] as const;
type Tab = (typeof tabs)[number];

const snippets: Record<Tab, string> = {
  "Next.js": `import { evaluateTrust } from "@internet-passport/sdk";

const result = await evaluateTrust({
  subjectId: session.user.id,
  action: "login",
});`,
  Python: `from internet_passport import evaluate_trust

result = evaluate_trust(
    subject_id=user.id,
    action="login"
)`,
  Go: `result, err := passport.EvaluateTrust(ctx, passport.Request{
  SubjectID: user.ID,
  Action:    "login",
})`,
  Curl: `curl -X POST https://api.your-domain.dev/v1/trust/evaluate \\
  -H "Authorization: Bearer $IP_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"subjectId":"sub_123","action":"login"}'`,
};

const sampleResponse = `{
  "decision": "ALLOW",
  "trust_score": 0.99,
  "provenance": "verified",
  "signals": ["identity_verified", "device_reputation_pass"]
}`;

export function DXShowcase() {
  const [activeTab, setActiveTab] = useState<Tab>("Next.js");
  const [copied, setCopied] = useState(false);

  const activeCode = useMemo(() => snippets[activeTab], [activeTab]);

  async function copyCode() {
    await navigator.clipboard.writeText(activeCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="terminal-panel rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-card-border pb-3">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium uppercase tracking-[0.08em] transition ${
                  tab === activeTab
                    ? "bg-cyan-500/20 text-cyan-200"
                    : "bg-slate-900/60 text-slate-300 hover:bg-slate-800/75"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={copyCode}
            className="inline-flex items-center gap-1 rounded-md border border-card-border bg-slate-900/70 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <pre className="mt-3 overflow-x-auto font-mono text-xs leading-relaxed text-slate-200">{activeCode}</pre>
      </div>

      <div className="terminal-panel rounded-2xl p-4">
        <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Sample response</p>
        <pre className="mt-3 overflow-x-auto font-mono text-xs leading-relaxed text-slate-200">
          {sampleResponse}
        </pre>
      </div>
    </div>
  );
}
