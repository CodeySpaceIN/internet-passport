import type { ReactNode } from "react";
import { requirePermission } from "@/lib/auth/server";
import { AppShell } from "@/components/layout/app-shell";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requirePermission("admin:access");
  return (
    <AppShell
      heading="Trust Admin"
      subheading="Operational command center for reviews, suspicious activity, enforcement, and trust governance."
      activeNav="Trust Admin"
    >
      {children}
    </AppShell>
  );
}
