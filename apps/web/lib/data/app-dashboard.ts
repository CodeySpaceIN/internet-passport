import { prisma } from "@internet-passport/db";
import type { Session } from "next-auth";

export function getTenantIdFromSession(session: Session) {
  return session.user.memberships[0]?.tenantId ?? null;
}

export async function getDashboardData(tenantId: string) {
  const [
    trustScores,
    verifications,
    signedActions,
    auditLogs,
    riskSignals,
    identityLinks,
    organizations,
    apiRequests,
    apiKeys,
  ] = await Promise.all([
    prisma.trustScore.findMany({
      where: { tenantId, isCurrent: true },
      orderBy: { calculatedAt: "desc" },
      take: 1,
    }),
    prisma.verificationRecord.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
        organization: { select: { id: true, name: true } },
        agent: { select: { id: true, displayName: true } },
      },
      take: 8,
    }),
    prisma.signedAction.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.auditLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.riskSignal.findMany({
      where: { tenantId },
      orderBy: { detectedAt: "desc" },
      take: 8,
    }),
    prisma.identityProviderLink.findMany({
      where: { tenantId },
      orderBy: { linkedAt: "desc" },
      include: { user: { select: { id: true, name: true, email: true } } },
      take: 8,
    }),
    prisma.organization.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
        domains: true,
      },
      take: 5,
    }),
    prisma.apiRequestLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { apiKey: { select: { id: true, name: true, keyPrefix: true } } },
    }),
    prisma.apiKey.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  return {
    trustScore: trustScores[0] ?? null,
    verifications,
    signedActions,
    auditLogs,
    riskSignals,
    identityLinks,
    organizations,
    apiRequests,
    apiKeys,
  };
}

export async function getProfileData(tenantId: string, userId: string) {
  const [user, memberships, identities, sessions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: {
        trustScores: {
          where: { tenantId, isCurrent: true },
          orderBy: { calculatedAt: "desc" },
          take: 1,
        },
      },
    }),
    prisma.membership.findMany({ where: { tenantId, userId } }),
    prisma.identityProviderLink.findMany({
      where: { tenantId, userId },
      orderBy: { linkedAt: "desc" },
    }),
    prisma.session.findMany({
      where: { tenantId, userId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);
  return { user, memberships, identities, sessions };
}

export async function getVerificationsData(tenantId: string) {
  return prisma.verificationRecord.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true } },
      organization: { select: { id: true, name: true } },
      agent: { select: { id: true, displayName: true } },
      requestedBy: { select: { id: true, name: true, email: true } },
      reviewedBy: { select: { id: true, name: true, email: true } },
    },
    take: 50,
  });
}

export async function getSecurityData(tenantId: string, userId: string) {
  const [signals, sessions, keys] = await Promise.all([
    prisma.riskSignal.findMany({
      where: { tenantId },
      orderBy: { detectedAt: "desc" },
      take: 20,
    }),
    prisma.session.findMany({
      where: { tenantId, userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.apiKey.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);
  return { signals, sessions, keys };
}

export async function getActivityData(tenantId: string) {
  const [auditLogs, signedActions] = await Promise.all([
    prisma.auditLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
    prisma.signedAction.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);
  return { auditLogs, signedActions };
}

export async function getApiData(tenantId: string) {
  const [apiKeys, requests, organizations] = await Promise.all([
    prisma.apiKey.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.apiRequestLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { apiKey: { select: { id: true, name: true, keyPrefix: true } } },
    }),
    prisma.organization.findMany({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
      take: 50,
    }),
  ]);
  return { apiKeys, requests, organizations };
}

export async function getOrganizationsData(tenantId: string) {
  return prisma.organization.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
      domains: true,
      trustScores: { where: { isCurrent: true }, orderBy: { calculatedAt: "desc" }, take: 1 },
    },
  });
}
