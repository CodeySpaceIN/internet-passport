import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import { compare } from "bcryptjs";
import { createHash } from "node:crypto";
import { z } from "zod";
import { prisma } from "@internet-passport/db";
import { webEnv } from "@/lib/config/env";
import { deriveAppRoles } from "@/lib/auth/roles";
import { writeAuditAndSignedAction } from "@/lib/audit/service";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const authSecret =
  webEnv.AUTH_SECRET ?? webEnv.NEXTAUTH_SECRET ?? webEnv.JWT_SECRET;

const superAdminEmails = new Set(
  (webEnv.SUPER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);

function hasGoogleOAuthConfig() {
  return Boolean(webEnv.GOOGLE_CLIENT_ID && webEnv.GOOGLE_CLIENT_SECRET);
}

function hasGitHubOAuthConfig() {
  return Boolean(webEnv.GITHUB_CLIENT_ID && webEnv.GITHUB_CLIENT_SECRET);
}

function hashToken(token?: string | null) {
  if (!token) {
    return null;
  }
  return createHash("sha256").update(token).digest("hex");
}

async function hydrateClaims(input: { userId?: string; email?: string | null }) {
  const user = input.userId
    ? await prisma.user.findUnique({
        where: { id: input.userId },
        include: { memberships: true, organizationMemberships: true },
      })
    : input.email
      ? await prisma.user.findUnique({
          where: { email: input.email.toLowerCase() },
          include: { memberships: true, organizationMemberships: true },
        })
      : null;

  if (!user) {
    return null;
  }

  const roles = deriveAppRoles({
    tenantMemberships: user.memberships.map((membership) => ({
      tenantId: membership.tenantId,
      role: membership.role,
    })),
    organizationMemberships: user.organizationMemberships.map((membership) => ({
      organizationId: membership.organizationId,
      role: membership.role,
    })),
    isSuperAdmin: superAdminEmails.has(user.email.toLowerCase()),
  });

  return {
    userId: user.id,
    email: user.email,
    memberships: user.memberships.map((membership) => ({
      tenantId: membership.tenantId,
      role: membership.role,
    })),
    organizationMemberships: user.organizationMemberships.map((membership) => ({
      organizationId: membership.organizationId,
      role: membership.role,
    })),
    roles,
    onboardingRequired: user.organizationMemberships.length === 0,
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: authSecret,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  jwt: {
    maxAge: 60 * 60 * 24 * 30,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials) => {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        });

        if (!user?.passwordHash) {
          return null;
        }

        const passwordMatches = await compare(parsed.data.password, user.passwordHash);
        if (!passwordMatches) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? user.email,
        };
      },
    }),
    ...(hasGoogleOAuthConfig()
      ? [
          Google({
            clientId: webEnv.GOOGLE_CLIENT_ID!,
            clientSecret: webEnv.GOOGLE_CLIENT_SECRET!,
          }),
        ]
      : []),
    ...(hasGitHubOAuthConfig()
      ? [
          GitHub({
            clientId: webEnv.GITHUB_CLIENT_ID!,
            clientSecret: webEnv.GITHUB_CLIENT_SECRET!,
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!account) {
        return false;
      }

      if (account.provider === "credentials") {
        return true;
      }

      if (!user.email) {
        return false;
      }

      const dbUser = await prisma.user.upsert({
        where: { email: user.email.toLowerCase() },
        update: {
          name: user.name ?? undefined,
          imageUrl: user.image ?? undefined,
          deletedAt: null,
        },
        create: {
          email: user.email.toLowerCase(),
          name: user.name ?? user.email,
          imageUrl: user.image ?? undefined,
        },
      });

      const tenant = await prisma.tenant.upsert({
        where: { slug: "demo-tenant" },
        update: {},
        create: {
          name: "Demo Tenant",
          slug: "demo-tenant",
        },
      });

      await prisma.membership.upsert({
        where: {
          tenantId_userId: {
            tenantId: tenant.id,
            userId: dbUser.id,
          },
        },
        update: {},
        create: {
          tenantId: tenant.id,
          userId: dbUser.id,
          role: "ANALYST",
        },
      });

      if (account.provider === "google" || account.provider === "github") {
        await prisma.identityProviderLink.upsert({
          where: {
            tenantId_provider_providerUserId: {
              tenantId: tenant.id,
              provider: account.provider === "google" ? "GOOGLE" : "GITHUB",
              providerUserId: String(account.providerAccountId),
            },
          },
          update: {
            userId: dbUser.id,
            providerEmail: dbUser.email,
            lastSyncedAt: new Date(),
          },
          create: {
            tenantId: tenant.id,
            userId: dbUser.id,
            provider: account.provider === "google" ? "GOOGLE" : "GITHUB",
            providerUserId: String(account.providerAccountId),
            providerEmail: dbUser.email,
            accessTokenHash: hashToken(account.access_token),
            refreshTokenHash: hashToken(account.refresh_token),
          },
        });
      }

      user.id = dbUser.id;
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
      }

      const claims = await hydrateClaims({
        userId: typeof token.userId === "string" ? token.userId : undefined,
        email: typeof token.email === "string" ? token.email : undefined,
      });

      if (claims) {
        token.userId = claims.userId;
        token.email = claims.email;
        token.memberships = claims.memberships;
        token.organizationMemberships = claims.organizationMemberships;
        token.roles = claims.roles;
        token.onboardingRequired = claims.onboardingRequired;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.userId ?? "");
        session.user.email = String(token.email ?? "");
        session.user.memberships = Array.isArray(token.memberships)
          ? token.memberships
          : [];
        session.user.organizationMemberships = Array.isArray(token.organizationMemberships)
          ? token.organizationMemberships
          : [];
        session.user.roles = Array.isArray(token.roles) ? token.roles : ["user"];
        session.user.onboardingRequired = Boolean(token.onboardingRequired);
      }

      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (!user?.id) {
        return;
      }
      const claims = await hydrateClaims({
        userId: user.id,
        email: user.email,
      });
      const tenantId = claims?.memberships[0]?.tenantId;
      if (!tenantId) {
        return;
      }
      await writeAuditAndSignedAction(
        {
          tenantId,
          actor: { type: "USER", userId: user.id },
          actionType: "LOGIN",
          targetType: "Session",
          targetId: user.id,
          outcome: "SUCCESS",
          metadata: {
            provider: "next-auth",
          },
        },
        {
          actionType: "LOGIN",
          targetType: "Session",
          targetId: user.id,
          payload: { provider: "next-auth" },
          contextType: "auth",
        },
      );
    },
    async signOut(message) {
      const token = "token" in message ? message.token : null;
      const tokenUserId =
        typeof token?.userId === "string"
          ? token.userId
          : typeof token?.sub === "string"
            ? token.sub
            : undefined;
      if (!tokenUserId) {
        return;
      }
      const claims = await hydrateClaims({
        userId: tokenUserId,
      });
      const tenantId = claims?.memberships[0]?.tenantId;
      if (!tenantId) {
        return;
      }
      await writeAuditAndSignedAction(
        {
          tenantId,
          actor: { type: "USER", userId: tokenUserId },
          actionType: "LOGOUT",
          targetType: "Session",
          targetId: tokenUserId,
          outcome: "SUCCESS",
          metadata: {
            provider: "next-auth",
          },
        },
        {
          actionType: "LOGOUT",
          targetType: "Session",
          targetId: tokenUserId,
          payload: { provider: "next-auth" },
          contextType: "auth",
        },
      );
    },
  },
  trustHost: true,
});
