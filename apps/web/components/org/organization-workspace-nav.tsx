"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { key: "overview", label: "Overview", suffix: "" },
  { key: "members", label: "Members", suffix: "/members" },
  { key: "agents", label: "Agents", suffix: "/agents" },
  { key: "domains", label: "Domains", suffix: "/domains" },
  { key: "audit", label: "Audit", suffix: "/audit" },
  { key: "settings", label: "Settings", suffix: "/settings" },
] as const;

export function OrganizationWorkspaceNav({ orgId }: { orgId: string }) {
  const pathname = usePathname();
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {tabs.map((tab) => {
        const href = `/app/organizations/${orgId}${tab.suffix}` as Route;
        const active = pathname === href;
        return (
          <Link
            key={tab.key}
            href={href}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs font-medium transition",
              active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
