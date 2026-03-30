export type AppRole =
  | "user"
  | "org_owner"
  | "org_admin"
  | "org_member"
  | "trust_admin"
  | "super_admin";

export type TenantMembership = {
  tenantId: string;
  role: string;
};

export type OrganizationMembership = {
  organizationId: string;
  role: string;
};

type RoleDerivationInput = {
  tenantMemberships: TenantMembership[];
  organizationMemberships: OrganizationMembership[];
  isSuperAdmin: boolean;
};

export function deriveAppRoles(input: RoleDerivationInput): AppRole[] {
  const roles = new Set<AppRole>(["user"]);

  const tenantHasTrustAdmin = input.tenantMemberships.some((membership) =>
    ["OWNER", "ADMIN", "TRUST_REVIEWER"].includes(membership.role),
  );
  if (tenantHasTrustAdmin) {
    roles.add("trust_admin");
  }

  const orgRoles = input.organizationMemberships.map((membership) => membership.role);
  if (orgRoles.length > 0) {
    roles.add("org_member");
  }
  if (orgRoles.some((role) => ["ADMIN", "OWNER"].includes(role))) {
    roles.add("org_admin");
  }
  if (orgRoles.includes("OWNER")) {
    roles.add("org_owner");
  }
  if (input.isSuperAdmin) {
    roles.add("super_admin");
  }

  return Array.from(roles);
}

export function hasRole(userRoles: string[] | undefined, requiredRole: AppRole): boolean {
  return Boolean(userRoles?.includes(requiredRole));
}
