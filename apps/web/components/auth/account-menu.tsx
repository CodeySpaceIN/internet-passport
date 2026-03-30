import Link from "next/link";
import type { Route } from "next";
import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";

export async function AccountMenu() {
  const session = await auth();
  if (!session?.user) {
    return (
      <div className="flex items-center gap-2">
        <Link href={"/login" as Route}>
          <Button size="sm" variant="ghost">
            Sign In
          </Button>
        </Link>
        <Link href={"/signup" as Route}>
          <Button size="sm">Sign Up</Button>
        </Link>
      </div>
    );
  }

  const displayName = session.user.name ?? session.user.email ?? "U";
  const initials =
    displayName
      .split(" ")
      .map((part) => part.trim().charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  return (
    <details className="relative z-50">
      <summary className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full border border-slate-300 bg-white text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
        <span aria-hidden>{initials}</span>
        <span className="sr-only">Open account menu</span>
      </summary>
      <div className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-xl shadow-black/10 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/40">
        <p className="text-sm font-medium">{session.user.email}</p>
        <p className="mt-1 text-xs text-muted">Roles: {session.user.roles.join(", ")}</p>
        <div className="mt-3 flex flex-col gap-2">
          <Link href={"/dashboard" as Route} className="text-sm underline underline-offset-4">
            Dashboard
          </Link>
          {session.user.roles.includes("trust_admin") || session.user.roles.includes("super_admin") ? (
            <Link href={"/admin" as Route} className="text-sm underline underline-offset-4">
              Admin
            </Link>
          ) : null}
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button type="submit" size="sm" variant="outline" className="w-full">
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </details>
  );
}
