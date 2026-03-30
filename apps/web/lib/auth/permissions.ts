import type { AppRole } from "./roles";

export type Permission =
  | "dashboard:view"
  | "organization:manage"
  | "organization:members:manage"
  | "trust:review"
  | "admin:access";

const permissionMap: Record<AppRole, Permission[]> = {
  user: ["dashboard:view"],
  org_member: ["dashboard:view"],
  org_admin: ["dashboard:view", "organization:manage", "organization:members:manage"],
  org_owner: ["dashboard:view", "organization:manage", "organization:members:manage"],
  trust_admin: ["dashboard:view", "trust:review", "admin:access"],
  super_admin: ["dashboard:view", "organization:manage", "organization:members:manage", "trust:review", "admin:access"],
};

export function hasPermission(userRoles: string[] | undefined, permission: Permission): boolean {
  if (!userRoles || userRoles.length === 0) {
    return false;
  }

  return userRoles.some((role) => {
    const mapped = permissionMap[role as AppRole];
    return mapped?.includes(permission);
  });
}
