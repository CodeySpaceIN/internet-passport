import Link from "next/link";
import type { Route } from "next";
import Image from "next/image";
import { Menu, Search } from "lucide-react";
import { AccountMenu } from "@/components/auth/account-menu";
import { WorkspaceNav, WorkspaceQuickActions } from "@/components/app/workspace-nav";

type WorkspaceShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

export function WorkspaceShell({ title, subtitle, children }: WorkspaceShellProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[256px_1fr]">
        <aside className="hidden border-r border-slate-200 bg-slate-100 lg:block">
          <div className="px-5 pb-4 pt-5">
            <Link href={"/app" as Route} className="flex items-center gap-2">
              <Image src="/internetpass_black.png" alt="Internet Passport" width={220} height={70} className="h-7 w-auto" />
            </Link>
            <p className="mt-4 text-[10px] uppercase tracking-[0.22em] text-slate-500">Navigation</p>
          </div>
          <div className="px-3">
            <WorkspaceNav />
          </div>
          <div className="px-3 pt-4">
            <WorkspaceQuickActions />
          </div>
        </aside>

        <div className="relative">
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur md:px-6">
            <div className="flex items-center gap-3">
              <details className="relative lg:hidden">
                <summary className="list-none rounded-lg border border-slate-200 bg-white p-2 text-slate-700">
                  <Menu className="h-4 w-4" />
                </summary>
                <div className="absolute left-0 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
                  <WorkspaceNav compact />
                </div>
              </details>

              <div className="hidden w-full max-w-xl items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 md:flex">
                <Search className="h-4 w-4 text-slate-500" />
                <input
                  className="h-7 w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-500"
                  placeholder="Search verifications, actions, organizations..."
                />
              </div>

              <div className="ml-auto">
                <AccountMenu />
              </div>
            </div>
          </header>

          <section className="px-4 pt-5 md:px-6">
            <p className="text-xs text-slate-500">{new Date().toLocaleDateString()}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
            {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
          </section>

          <main className="px-4 pb-8 pt-5 md:px-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
