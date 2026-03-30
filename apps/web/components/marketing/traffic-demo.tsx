"use client";

import Image from "next/image";
import { Bot, CheckCircle2, ChevronRight, FileAudio2, FileCode2, UserRound, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { TrustBadge } from "@/components/marketing/trust-badge";

const incoming = [
  { label: "User Session", icon: UserRound },
  { label: "Bot Script", icon: Bot },
  { label: "Voice Note", icon: FileAudio2 },
  { label: "API Payload", icon: FileCode2 },
];

const outputs = [
  {
    label: "Verified Human",
    detail: "identity checks passed",
    tone: "text-emerald-200 border-emerald-400/40 bg-emerald-500/10",
    icon: CheckCircle2,
  },
  {
    label: "Authorized AI Agent",
    detail: "credential scope validated",
    tone: "text-cyan-200 border-cyan-400/40 bg-cyan-500/10",
    icon: CheckCircle2,
  },
  {
    label: "Blocked: Synthetic Voice",
    detail: "liveness/provenance mismatch",
    tone: "text-rose-200 border-rose-400/40 bg-rose-500/10",
    icon: XCircle,
  },
];

export function TrafficDemo() {
  return (
    <Card className="terminal-panel relative overflow-hidden p-0">
      <div className="infrastructure-grid absolute inset-0 opacity-25" />
      <div className="relative border-b border-card-border bg-slate-950/70 px-5 py-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Live Trust Router</p>
          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.8)]" />
            Runtime Active
          </span>
        </div>
      </div>

      <div className="relative grid gap-4 p-5 lg:grid-cols-[1fr_220px_1fr] lg:gap-6">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Incoming traffic</p>
          {incoming.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="group flex items-center justify-between rounded-lg border border-slate-700/75 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-200 transition hover:border-cyan-400/45 hover:bg-slate-900/85"
              >
                <span className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-cyan-300" />
                  {item.label}
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-500 transition group-hover:text-cyan-300" />
              </div>
            );
          })}
        </div>

        <div className="relative flex flex-col items-center justify-center rounded-2xl border border-cyan-400/35 bg-cyan-500/10 px-4 py-6">
          <div className="absolute inset-4 rounded-xl border border-cyan-400/20" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-cyan-300/50 bg-cyan-400/10">
            <Image src="/internetpass_black.png" alt="Internet Passport logo" width={40} height={40} className="h-10 w-10 rounded-sm" />
          </div>
          <p className="relative mt-3 text-center text-[11px] font-medium uppercase tracking-[0.2em] text-cyan-100">
            Internet Passport
          </p>
          <p className="relative mt-1 text-[11px] text-slate-300">Trust Engine</p>
          <div className="relative mt-4">
            <TrustBadge label="Verified Route" />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Output decisions</p>
          {outputs.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className={`rounded-lg border px-3 py-2.5 ${item.tone}`}>
                <p className="flex items-center gap-2 text-sm font-medium">
                  <Icon className="h-4 w-4" />
                  {item.label}
                </p>
                <p className="mt-1 text-xs opacity-85">{item.detail}</p>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
