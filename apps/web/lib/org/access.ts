import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import type { Route } from "next";

export type OrgRole = "OWNER" | "ADMIN" | "SECURITY" | "DEVELOPER" | "ANALYST" | "BILLING" | "REVIEWER";

const manageRoles: OrgRole[] = ["OWNER", "ADMIN", "SECURITY"];

export function getOrgMembership(session: Session, organizationId: string) {
  return session.user.organizationMemberships.find((membership) => membership.organizationId === organizationId) ?? null;
}

export function canManageOrganization(role: string) {
  return manageRoles.includes(role as OrgRole);
}

export function requireOrganizationAccess(
  session: Session,
  organizationId: string,
  level: "view" | "manage" = "view",
) {
  const membership = getOrgMembership(session, organizationId);
  if (!membership) {
    redirect("/app/organizations" as Route);
  }
  if (level === "manage" && !canManageOrganization(membership.role)) {
    redirect(`/app/organizations/${organizationId}` as Route);
  }
  return membership;
}
