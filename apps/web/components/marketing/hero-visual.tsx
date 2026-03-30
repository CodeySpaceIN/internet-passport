"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";

type Node = { id: string; x: number; y: number; r: number };

const nodes: Node[] = [
  { id: "n1", x: 56, y: 22, r: 6 },
  { id: "n2", x: 80, y: 38, r: 5 },
  { id: "n3", x: 66, y: 62, r: 7 },
  { id: "n4", x: 36, y: 54, r: 5 },
  { id: "n5", x: 30, y: 30, r: 6 },
  { id: "n6", x: 49, y: 44, r: 5 },
];

const links: Array<[string, string]> = [
  ["n1", "n2"],
  ["n2", "n3"],
  ["n3", "n4"],
  ["n4", "n5"],
  ["n5", "n1"],
  ["n1", "n6"],
  ["n2", "n6"],
  ["n3", "n6"],
  ["n4", "n6"],
  ["n5", "n6"],
];

export function HeroVisual() {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const nodeMap = useMemo(
    () => Object.fromEntries(nodes.map((node) => [node.id, node])),
    [],
  );

  return (
    <div
      className="relative h-full min-h-[500px]"
      onMouseMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width - 0.5) * 10;
        const y = ((event.clientY - rect.top) / rect.height - 0.5) * 10;
        setTilt({ x, y });
      }}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
    >
      <div className="absolute left-2 top-5 h-56 w-56 animate-[floatOrb_6s_ease-in-out_infinite] rounded-full bg-cyan-500/30 blur-3xl" />
      <div className="absolute right-4 top-20 h-64 w-64 animate-[floatOrb_7s_ease-in-out_infinite] rounded-full bg-fuchsia-500/28 blur-3xl" />
      <div className="absolute bottom-6 left-20 h-52 w-52 animate-[floatOrb_8s_ease-in-out_infinite] rounded-full bg-emerald-400/25 blur-3xl" />

      <Card
        className="glass-card relative z-10 mt-6 overflow-hidden p-0 transition-transform duration-200"
        style={{
          transform: `perspective(1200px) rotateX(${(-tilt.y / 2).toFixed(2)}deg) rotateY(${(
            tilt.x / 2
          ).toFixed(2)}deg)`,
        }}
      >
        <div className="border-b border-card-border bg-slate-900/60 px-5 py-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Live Trust Mesh</p>
        </div>

        <div className="color-mesh grid gap-4 p-5">
          <div className="rounded-xl border border-card-border bg-slate-900/75 p-4">
            <svg viewBox="0 0 100 80" className="h-56 w-full">
              {links.map(([a, b]) => {
                const start = nodeMap[a];
                const end = nodeMap[b];
                return (
                  <line
                    key={`${a}-${b}`}
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                    stroke="rgba(56,189,248,0.45)"
                    strokeWidth="1.4"
                  />
                );
              })}
              {nodes.map((node, idx) => (
                <g key={node.id}>
                  <circle cx={node.x} cy={node.y} r={node.r + 2.5} fill="rgba(34,211,238,0.18)" />
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.r}
                    fill="rgba(2,6,23,0.9)"
                    stroke="rgba(56,189,248,0.88)"
                    strokeWidth="1.4"
                  >
                    <animate
                      attributeName="r"
                      values={`${node.r};${node.r + 0.8};${node.r}`}
                      dur={`${2 + idx * 0.2}s`}
                      repeatCount="indefinite"
                    />
                  </circle>
                </g>
              ))}
            </svg>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Identity", value: "Verified" },
              { label: "Risk", value: "Monitored" },
              { label: "Actions", value: "Signed" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-card-border bg-slate-900/75 px-3 py-2"
              >
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted">{item.label}</p>
                <p className="mt-1 text-lg font-semibold text-slate-100">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
