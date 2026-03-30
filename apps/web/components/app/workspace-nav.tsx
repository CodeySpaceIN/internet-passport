"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import {
  Activity,
  Building2,
  Fingerprint,
  KeyRound,
  LayoutDashboard,
  ShieldCheck,
  UserRound,
  WalletCards,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/profile", label: "Profile", icon: UserRound },
  { href: "/app/verifications", label: "Verifications", icon: Fingerprint },
  { href: "/app/security", label: "Security", icon: ShieldCheck },
  { href: "/app/activity", label: "Activity", icon: Activity },
  { href: "/app/api", label: "API", icon: KeyRound },
  { href: "/app/organizations", label: "Organizations", icon: Building2 },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/app") return pathname === "/app";
  return pathname.startsWith(href);
}

export function WorkspaceNav({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();

  return (
    <nav className={cn("space-y-1", compact && "space-y-2")}>
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href as Route}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition",
              active
                ? "border border-slate-200 bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              compact && "px-2.5 py-2",
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function WorkspaceQuickActions() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-center gap-2">
        <WalletCards className="h-4 w-4 text-slate-600" />
        <p className="text-sm font-semibold text-slate-900">Workspace</p>
      </div>
      <p className="mt-1 text-xs text-slate-500">Demo tenant seeded with verification, risk, org, and API data.</p>
    </div>
  );
}
