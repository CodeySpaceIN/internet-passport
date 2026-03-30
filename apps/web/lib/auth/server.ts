import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import type { Route } from "next";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { hasRole, type AppRole } from "@/lib/auth/roles";

export async function getServerSessionOrRedirect() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login" as Route);
  }
  return session;
}

export async function requireRole(role: AppRole) {
  const session = await getServerSessionOrRedirect();
  if (!hasRole(session.user.roles, role)) {
    redirect("/dashboard");
  }
  return session;
}

export async function requirePermission(permission: Parameters<typeof hasPermission>[1]) {
  const session = await getServerSessionOrRedirect();
  if (!hasPermission(session.user.roles, permission)) {
    redirect("/dashboard");
  }
  return session;
}

export function hasOrganizationAccess(
  session: Session | null,
  organizationId: string,
  allowedRoles: string[] = ["OWNER", "ADMIN", "SECURITY", "DEVELOPER", "ANALYST", "REVIEWER"],
) {
  if (!session?.user) {
    return false;
  }
  return session.user.organizationMemberships.some(
    (membership: { organizationId: string; role: string }) =>
      membership.organizationId === organizationId && allowedRoles.includes(membership.role),
  );
}
