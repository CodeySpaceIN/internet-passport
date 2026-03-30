import Link from "next/link";
import Image from "next/image";
import type { Route } from "next";
import type { ReactElement } from "react";
import {
  Bell,
  Building2,
  ChevronRight,
  CircleUserRound,
  LayoutDashboard,
  Search,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { AccountMenu } from "@/components/auth/account-menu";
import { AdminTreeLinks } from "@/components/layout/admin-tree-links";
import { ThemeToggle } from "@/components/theme/theme-toggle";

type AppShellProps = {
  heading: string;
  subheading: string;
  activeNav?: "Dashboard" | "Trust Admin" | "Organizations";
  activeAdminPath?: "/admin" | "/admin/reviews" | "/admin/flags" | "/admin/users" | "/admin/orgs" | "/admin/agents" | "/admin/audit";
  children: React.ReactNode;
};

const trustAdminChildren = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/flags", label: "Flags" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/orgs", label: "Organizations" },
  { href: "/admin/agents", label: "Agents" },
  { href: "/admin/audit", label: "Audit" },
] as const;

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, section: "Main" },
  { href: "/onboarding", label: "Organizations", icon: Building2, section: "Main" },
  { href: "/admin", label: "Trust Admin", icon: ShieldCheck, section: "Main", children: trustAdminChildren },
  { href: "/dashboard", label: "Alerts", icon: Bell, section: "Operations" },
  { href: "/dashboard", label: "Settings", icon: Settings, section: "Operations" },
] as {
  href: Route;
  label: string;
  section: "Main" | "Operations";
  icon: (props: { className?: string }) => ReactElement;
  children?: readonly { href: string; label: string }[];
}[];

export function AppShell({ heading, subheading, activeNav, activeAdminPath, children }: AppShellProps) {
  const mainItems = navItems.filter((item) => item.section === "Main");
  const operationItems = navItems.filter((item) => item.section === "Operations");

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 [font-family:Inter,system-ui,Segoe_UI,Arial,sans-serif] dark:bg-slate-950 dark:text-slate-100">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[248px_1fr]">
        <aside className="hidden border-r border-blue-900/60 bg-gradient-to-b from-blue-950 via-slate-950 to-slate-900 text-slate-100 lg:block">
          <div className="px-5 pb-5 pt-6">
            <div className="flex items-center">
              <Image
                src="/internetpass_black.png"
                alt="Internet Passport logo"
                width={180}
                height={46}
                className="h-10 w-auto invert brightness-0"
              />
            </div>
            <p className="mt-5 text-[10px] uppercase tracking-[0.24em] text-slate-400">Workspace</p>
            <div className="mt-3 flex items-center justify-between rounded-xl border border-blue-800/50 bg-blue-900/30 px-3 py-2.5">
              <div>
                <p className="text-sm font-medium text-slate-100">Trust Ops</p>
                <p className="text-[11px] text-slate-300">PORTAL_001</p>
              </div>
              <CircleUserRound className="h-4 w-4 text-slate-300" />
            </div>
          </div>
          <nav className="px-3 pb-5">
            <p className="px-2 pb-2 text-[10px] uppercase tracking-[0.22em] text-slate-400">Main</p>
            {mainItems.map((item) => {
              const Icon = item.icon;
              const isTrustAdmin = item.label === "Trust Admin";
              const itemIsActive = activeNav === item.label || (isTrustAdmin && Boolean(activeAdminPath));

              return (
                <div key={`${item.href}-${item.label}`}>
                  <Link
                    href={item.href}
                    prefetch
                    scroll={false}
                    className={`mb-1.5 flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition ${
                      itemIsActive
                        ? "border-blue-500/60 bg-blue-500/20 text-white shadow-sm"
                        : "border-transparent text-slate-300 hover:border-blue-800/70 hover:bg-blue-900/40 hover:text-white"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="flex-1">{item.label}</span>
                    {isTrustAdmin ? <ChevronRight className="h-3.5 w-3.5 text-slate-400" /> : null}
                  </Link>

                  {isTrustAdmin && activeNav === "Trust Admin" ? <AdminTreeLinks items={trustAdminChildren} /> : null}
                </div>
              );
            })}
            <p className="px-2 pb-2 pt-5 text-[10px] uppercase tracking-[0.22em] text-slate-400">Operations</p>
            {operationItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={`${item.href}-${item.label}`}
                  href={item.href}
                  prefetch
                  scroll={false}
                  className={`mb-1.5 flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition ${
                    activeNav === item.label
                      ? "border-blue-500/60 bg-blue-500/20 text-white shadow-sm"
                      : "border-transparent text-slate-300 hover:border-blue-800/70 hover:bg-blue-900/40 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <div className="relative">
          <header className="relative z-40 border-b border-slate-200 bg-white/90 px-6 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
            <div className="grid items-center gap-3 md:grid-cols-[1fr_minmax(420px,620px)_1fr]">
              <div className="hidden md:block" />
              <div className="flex h-10 w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 dark:border-slate-700 dark:bg-slate-800">
                <Search className="h-4 w-4 text-slate-500" />
                <input
                  className="h-7 w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-500 dark:text-slate-100 dark:placeholder:text-slate-400"
                  placeholder="Search for users, organizations, agents..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <ThemeToggle />
                <AccountMenu />
              </div>
            </div>
          </header>
          <section className="px-6 pt-6">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Tuesday, 17 March 2026</p>
              <h1 className="mt-1 text-[36px] font-semibold leading-tight tracking-tight text-slate-900 dark:text-slate-100">{heading}</h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{subheading}</p>
            </div>
          </section>
          <main className="px-6 pb-8 pt-5">{children}</main>
        </div>
      </div>
    </div>
  );
}
