import type { DefaultSession } from "next-auth";
import type { AppRole } from "@/lib/auth/roles";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      memberships: { tenantId: string; role: string }[];
      organizationMemberships: { organizationId: string; role: string }[];
      roles: AppRole[];
      onboardingRequired: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    memberships?: { tenantId: string; role: string }[];
    organizationMemberships?: { organizationId: string; role: string }[];
    roles?: AppRole[];
    onboardingRequired?: boolean;
  }
}
