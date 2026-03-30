import Link from "next/link";
import type { ReactNode } from "react";
import type { Route } from "next";

const navItems = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/flags", label: "Flags" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/orgs", label: "Organizations" },
  { href: "/admin/agents", label: "Agents" },
  { href: "/admin/audit", label: "Audit" },
] as const satisfies { href: string; label: string }[];

export function AdminShell({
  title,
  subtitle,
  activePath,
  children,
}: {
  title: string;
  subtitle: string;
  activePath: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
          <aside className="rounded-2xl border border-slate-200 bg-white p-3">
            <p className="px-2 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Admin Console</p>
            <nav className="space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href as Route}
                  className={`block rounded-lg px-3 py-2 text-sm ${
                    activePath === item.href
                      ? "bg-slate-900 font-medium text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>
          <main className="space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
              <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
            </section>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
