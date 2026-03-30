"use client";

import Link from "next/link";
import type { Route } from "next";
import { motion } from "framer-motion";
import type { MouseEvent, ReactNode } from "react";
import { useState } from "react";
import {
  ArrowRight,
  Binary,
  Bot,
  CheckCircle2,
  FileAudio2,
  Fingerprint,
  GaugeCircle,
  Globe2,
  Radar,
  Shield,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const revealTransition = {
  type: "spring" as const,
  stiffness: 110,
  damping: 18,
  mass: 0.8,
};

function RevealOnScroll({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ y: 20, opacity: 0, scale: 0.95 }}
      whileInView={{ y: 0, opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.22 }}
      transition={{ ...revealTransition, delay }}
    >
      {children}
    </motion.div>
  );
}

function GlowCard({ className, children }: { className?: string; children: ReactNode }) {
  function handleMove(event: MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    event.currentTarget.style.setProperty("--mx", `${x}px`);
    event.currentTarget.style.setProperty("--my", `${y}px`);
  }

  return (
    <Card className={`spotlight-card ${className ?? ""}`} onMouseMove={handleMove}>
      {children}
    </Card>
  );
}

function HeroNodeVisual() {
  return (
    <GlowCard className="terminal-panel relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 lg:p-10">
      <div className="pointer-events-none absolute -left-20 top-4 h-56 w-56 rounded-full bg-orange-100/80 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-2 h-56 w-56 rounded-full bg-emerald-100/80 blur-3xl" />
      <div className="relative z-10">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Live Trust Flow</p>
          <p className="rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1 text-xs text-emerald-700">
            Decision in 200ms
          </p>
        </div>

        <div className="grid items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
          <div className="space-y-3">
            <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.14em] text-orange-700">Input</p>
              <p className="mt-1 text-sm font-medium text-slate-800">Account Sign-in Attempt</p>
            </div>
            <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.14em] text-orange-700">Input</p>
              <p className="mt-1 text-sm font-medium text-slate-800">Sensitive Message Action</p>
            </div>
          </div>

          <div className="relative mx-auto flex h-44 w-44 items-center justify-center rounded-full border-8 border-slate-100 bg-slate-900 shadow-xl">
            <div className="absolute h-32 w-32 rounded-full border border-emerald-400/40" />
            <div className="absolute h-24 w-24 rounded-full border border-emerald-400/25" />
            <Shield className="h-10 w-10 text-emerald-300" />
            <div className="absolute -bottom-7 text-center">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-600">Internet Passport Node</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.14em] text-emerald-700">Output</p>
              <p className="mt-1 text-sm font-medium text-slate-800">Verified Session Allowed</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.14em] text-emerald-700">Output</p>
              <p className="mt-1 text-sm font-medium text-slate-800">Blocked & Logged Action</p>
            </div>
          </div>
        </div>
      </div>
    </GlowCard>
  );
}

function GlobalNetworkSection() {
  const hubs = [
    { x: 118, y: 116, city: "San Francisco" },
    { x: 248, y: 100, city: "London" },
    { x: 322, y: 156, city: "Bangalore" },
    { x: 402, y: 126, city: "Tokyo" },
  ];

  return (
    <GlowCard className="terminal-panel rounded-3xl border border-slate-200 bg-white p-6 lg:p-8">
      <div className="text-center">
        <h2 className="text-3xl font-semibold text-slate-900">A truly global verification network.</h2>
        <p className="mx-auto mt-3 max-w-3xl text-sm text-slate-600 lg:text-base">
          Low-latency API edge nodes to verify users anywhere in the world.
        </p>
      </div>

      <div className="relative mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-8">
        <motion.div
          className="relative mx-auto max-w-4xl"
          animate={{ rotate: 360 }}
          transition={{ duration: 80, ease: "linear", repeat: Infinity }}
        >
          <svg viewBox="0 0 520 290" className="w-full">
            <defs>
              <pattern id="dot-grid" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
                <circle cx="1.6" cy="1.6" r="1" fill="rgba(51,65,85,0.2)" />
              </pattern>
            </defs>
            <ellipse cx="260" cy="145" rx="220" ry="110" fill="url(#dot-grid)" opacity="0.5" />
            <ellipse cx="260" cy="145" rx="220" ry="110" fill="none" stroke="rgba(51,65,85,0.2)" />
            <ellipse cx="260" cy="145" rx="160" ry="72" fill="none" stroke="rgba(51,65,85,0.16)" />
            <ellipse cx="260" cy="145" rx="90" ry="110" fill="none" stroke="rgba(51,65,85,0.12)" />
            <path d="M40 145 H480" stroke="rgba(51,65,85,0.12)" />
            <path d="M84 108 H436" stroke="rgba(51,65,85,0.1)" />
            <path d="M84 182 H436" stroke="rgba(51,65,85,0.1)" />
          </svg>
          <div className="absolute inset-0">
            {hubs.map((hub, idx) => (
              <div key={hub.city} className="absolute" style={{ left: `${hub.x}px`, top: `${hub.y}px` }}>
                <span className="absolute -inset-1 rounded-full bg-emerald-300/60" />
                <motion.span
                  className="absolute -inset-3 rounded-full border border-emerald-300/60"
                  animate={{ scale: [0.8, 1.8], opacity: [0.8, 0] }}
                  transition={{ duration: 2.4, repeat: Infinity, delay: idx * 0.6 }}
                />
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </GlowCard>
  );
}

const useCases = [
  {
    id: "hiring",
    title: "Hiring",
    copy: "Verify candidate identity before interviews and reduce impersonation risk in high-volume recruiting.",
  },
  {
    id: "fintech",
    title: "Fintech",
    copy: "Authenticate onboarding and high-risk account actions with liveness checks and policy controls.",
  },
  {
    id: "b2b",
    title: "B2B SaaS",
    copy: "Route privileged actions from users and agents through signed, auditable trust decisions.",
  },
] as const;

function UseCaseTabs() {
  const [activeCase, setActiveCase] = useState<(typeof useCases)[number]["id"]>("hiring");
  const active = useCases.find((item) => item.id === activeCase) ?? useCases[0];

  return (
    <GlowCard className="terminal-panel p-6 lg:p-8">
      <div className="flex flex-wrap gap-2">
        {useCases.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveCase(item.id)}
            className={`rounded-lg border px-3 py-1.5 text-sm ${
              item.id === activeCase
                ? "border-orange-300 bg-orange-100 text-orange-700"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
            }`}
            type="button"
          >
            {item.title}
          </button>
        ))}
      </div>
      <p className="mt-4 text-base text-slate-800">{active.copy}</p>
    </GlowCard>
  );
}

const bentoCards = [
  {
    title: "Identity Wallets",
    body: "Verified humans, zero exposed PII.",
    icon: ShieldCheck,
    className: "md:col-span-2",
  },
  {
    title: "AI Action Logs",
    body: "Accountable footprints for autonomous agents.",
    icon: Bot,
    className: "md:col-span-1",
  },
  {
    title: "Content Provenance",
    body: "Digital signatures for audio, video, and docs.",
    icon: Binary,
    className: "md:col-span-1",
  },
  {
    title: "Liveness API & Bot-Risk",
    body: "Defeat deepfakes with real-time biometric and behavioral checks.",
    icon: Radar,
    className: "md:col-span-2",
  },
];

const pricingTiers = [
  {
    name: "Starter",
    blurb: "Pay-as-you-go per API call for shipping first trust checks.",
    features: ["Voice liveness checks", "Bot-risk scoring", "Verification records"],
    cta: "Start with Starter",
  },
  {
    name: "Growth",
    blurb: "For scaling apps with higher verification volume and workflow needs.",
    features: ["Queue-based review workflows", "Signed action logs", "Priority integration support"],
    cta: "Integrate Now",
    featured: true,
  },
  {
    name: "Enterprise",
    blurb: "Custom SLAs, deployment options, and governance for regulated teams.",
    features: ["Dedicated architecture guidance", "Custom policy controls", "Advanced support channels"],
    cta: "Contact Sales",
  },
];

export default function LandingPage() {
  return (
    <main className="pb-24 pt-20">
      <section className="relative px-6 pt-10 lg:px-10 xl:px-14">
        <motion.div
          className="mx-auto max-w-5xl text-center"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: {
              transition: { staggerChildren: 0.12 },
            },
          }}
        >
          <motion.h1
            variants={{ hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } }}
            transition={revealTransition}
            className="mt-5 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl"
          >
            The trust infrastructure for an internet of humans, bots, and AI agents.
          </motion.h1>
          <motion.p
            variants={{ hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } }}
            transition={revealTransition}
            className="mx-auto mt-5 max-w-3xl text-base text-slate-600 sm:text-lg"
          >
            Verify who or what is behind an account, message, or API call-without exposing real-world
            identities.
          </motion.p>
          <motion.div
            variants={{ hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } }}
            transition={revealTransition}
            className="mt-8 flex flex-wrap justify-center gap-3"
          >
            <Link href={"/signup" as Route}>
              <Button size="lg">Get API Keys</Button>
            </Link>
            <Link href={"/docs" as Route}>
              <Button size="lg" variant="outline" className="border-slate-300 bg-white text-slate-900 hover:bg-slate-100">
                View Docs
              </Button>
            </Link>
          </motion.div>
          <motion.div
            variants={{ hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } }}
            transition={revealTransition}
            className="mx-auto mt-12 max-w-6xl"
          >
            <HeroNodeVisual />
          </motion.div>
        </motion.div>
      </section>

      <section className="px-6 py-24 lg:px-10 xl:px-14">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Core primitives</p>
          <h2 className="mt-3 text-3xl font-semibold text-slate-900">Stripe-for-trust APIs</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {bentoCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <RevealOnScroll key={card.title} delay={index * 0.05} className={card.className}>
                  <GlowCard
                    className={`terminal-panel h-full rounded-3xl border p-6 ${
                      card.title === "Identity Wallets"
                        ? "border-emerald-200 bg-emerald-50/60"
                        : card.title === "AI Action Logs"
                          ? "border-orange-200 bg-orange-50/60"
                          : card.title === "Content Provenance"
                            ? "border-sky-200 bg-sky-50/60"
                            : "border-violet-200 bg-violet-50/60"
                    }`}
                  >
                    <div
                      className={`mb-4 inline-flex rounded-xl border p-2.5 ${
                        card.title === "Identity Wallets"
                          ? "border-emerald-200 bg-emerald-100"
                          : card.title === "AI Action Logs"
                            ? "border-orange-200 bg-orange-100"
                            : card.title === "Content Provenance"
                              ? "border-sky-200 bg-sky-100"
                              : "border-violet-200 bg-violet-100"
                      }`}
                    >
                      <Icon className="h-5 w-5 text-slate-800" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900">{card.title}</h3>
                    <p className="mt-2 text-sm text-slate-700">{card.body}</p>

                    {card.title === "Identity Wallets" ? (
                      <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1.5 text-xs uppercase tracking-[0.12em] text-emerald-700">
                        <Shield className="h-3.5 w-3.5" />
                        Signed trust badge
                      </div>
                    ) : null}

                    {card.title === "AI Action Logs" ? (
                      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-100 p-3 font-mono text-xs text-slate-700">
                        <p>$ ip.log --agent=autonomous_worker --action=transfer</p>
                        <p className="mt-1 text-emerald-700">signature: valid</p>
                      </div>
                    ) : null}

                    {card.title === "Content Provenance" ? (
                      <div className="mt-6 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs text-slate-700">
                        <FileAudio2 className="h-4 w-4 text-emerald-700" />
                        Shielded media signature
                      </div>
                    ) : null}

                    {card.title === "Liveness API & Bot-Risk" ? (
                      <div className="mt-6 flex items-center gap-3 rounded-xl border border-violet-200 bg-violet-100 p-3">
                        <GaugeCircle className="h-5 w-5 text-orange-500" />
                        <div className="w-full">
                          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Trust score</p>
                          <div className="mt-1 h-1.5 rounded-full bg-violet-200">
                            <div className="h-1.5 w-[76%] rounded-full bg-violet-600" />
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </GlowCard>
                </RevealOnScroll>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-6 pb-24 lg:px-10 xl:px-14">
        <RevealOnScroll>
          <div className="mx-auto max-w-6xl">
            <GlobalNetworkSection />
          </div>
        </RevealOnScroll>
      </section>

      <section className="px-6 pb-24 lg:px-10 xl:px-14">
        <div className="mx-auto grid max-w-6xl items-center gap-6 md:grid-cols-2">
          <RevealOnScroll>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Developer experience</p>
            <h2 className="mt-3 text-3xl font-semibold text-slate-900 lg:text-4xl">Integrate reality checks in 3 lines of code.</h2>
            <ul className="mt-5 space-y-2 text-sm text-slate-700">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                RESTful API
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                Next.js & React SDKs
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                Webhooks for async verification
              </li>
            </ul>
          </RevealOnScroll>

          <RevealOnScroll delay={0.05}>
            <GlowCard className="terminal-panel p-4">
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-yellow-300/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                </div>
                <span className="text-xs text-slate-500">verify.ts</span>
              </div>
              <pre className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-slate-100 p-4 font-mono text-xs leading-relaxed text-slate-700">{`const response = await internetPassport.verify({
  user_id: "123",
  strict: true,
});`}</pre>
              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-100 p-4 font-mono text-xs text-slate-700">
                {`{
  "verified": true,
  "trust_score": `}
                <span className="animate-pulse text-emerald-700">0.99</span>
                {`,
  "agent_type": "human"
}`}
              </div>
            </GlowCard>
          </RevealOnScroll>
        </div>
      </section>

      <section id="use-cases" className="px-6 pb-24 lg:px-10 xl:px-14">
        <RevealOnScroll>
          <div className="mx-auto max-w-6xl">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Use cases</p>
            <h2 className="mt-3 text-3xl font-semibold text-slate-900">Hiring, Fintech, B2B SaaS</h2>
            <div className="mt-6">
              <UseCaseTabs />
            </div>
          </div>
        </RevealOnScroll>
      </section>

      <section className="px-6 pb-24 lg:px-10 xl:px-14">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Pricing</p>
          <h2 className="mt-3 text-3xl font-semibold text-slate-900">Transparent pricing for trust operations.</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {pricingTiers.map((tier) => (
              <RevealOnScroll key={tier.name}>
                <GlowCard
                  className={`terminal-panel flex h-full flex-col rounded-3xl border p-6 ${
                    tier.name === "Starter"
                      ? "border-emerald-200 bg-emerald-50/60"
                      : tier.name === "Growth"
                        ? "border-orange-200 bg-orange-50/70"
                        : "border-sky-200 bg-sky-50/60"
                  }`}
                >
                  <p className="text-lg font-semibold text-slate-900">{tier.name}</p>
                  <p className="mt-2 text-sm text-slate-700">{tier.blurb}</p>
                  <ul className="mt-5 space-y-2 text-sm text-slate-700">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link href={"/pricing" as Route} className="mt-auto block pt-6">
                    <Button className="w-full" variant={tier.featured ? "default" : "outline"}>
                      {tier.cta}
                    </Button>
                  </Link>
                </GlowCard>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-14 lg:px-10 xl:px-14">
        <RevealOnScroll>
          <div className="mx-auto max-w-6xl rounded-3xl border border-slate-200 bg-white p-6 lg:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Ready to integrate?</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-900">Verify, authenticate, sign, route, and block.</h3>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href={"/docs" as Route}>
                  <Button variant="outline" className="border-slate-300 bg-white text-slate-900 hover:bg-slate-100">
                    Docs
                  </Button>
                </Link>
                <Link href={"/signup" as Route}>
                  <Button>
                    Get API Keys
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </RevealOnScroll>
      </section>

      <div className="sr-only">
        <Globe2 />
        <Sparkles />
        <CheckCircle2 />
        <Fingerprint />
      </div>
    </main>
  );
}
