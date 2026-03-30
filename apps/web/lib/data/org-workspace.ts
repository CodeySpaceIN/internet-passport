import { prisma } from "@internet-passport/db";

export async function getOrganizationWorkspaceData(tenantId: string, orgId: string) {
  return prisma.organization.findFirst({
    where: { id: orgId, tenantId },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      members: { include: { user: { select: { id: true, name: true, email: true, createdAt: true } } } },
      domains: { orderBy: { createdAt: "desc" } },
      agents: { orderBy: { createdAt: "desc" }, include: { manager: { select: { id: true, name: true, email: true } } } },
      trustScores: { where: { isCurrent: true }, orderBy: { calculatedAt: "desc" }, take: 1 },
    },
  });
}

export async function getOrganizationTrustPosture(tenantId: string, orgId: string) {
  const [currentTrustScore, riskSignals, verifications, apiKeys] = await Promise.all([
    prisma.trustScore.findFirst({
      where: { tenantId, organizationId: orgId, isCurrent: true },
      orderBy: { calculatedAt: "desc" },
    }),
    prisma.riskSignal.findMany({
      where: { tenantId, organizationId: orgId, isActive: true },
      orderBy: { detectedAt: "desc" },
      take: 10,
    }),
    prisma.verificationRecord.findMany({
      where: { tenantId, organizationId: orgId },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
    prisma.apiKey.findMany({
      where: { tenantId, organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return { currentTrustScore, riskSignals, verifications, apiKeys };
}

export async function getOrganizationMembersData(tenantId: string, orgId: string) {
  return getOrganizationMembersDataPaginated(tenantId, orgId, {});
}

export async function getOrganizationMembersDataPaginated(
  tenantId: string,
  orgId: string,
  options: {
    query?: string;
    role?: string;
    page?: number;
    pageSize?: number;
  },
) {
  const pageSize = options.pageSize ?? 12;
  const page = Math.max(1, options.page ?? 1);
  const where = {
    organizationId: orgId,
    organization: { tenantId },
    ...(options.role && options.role !== "ALL" ? { role: options.role as any } : {}),
    ...(options.query
      ? {
          OR: [
            { user: { email: { contains: options.query, mode: "insensitive" as const } } },
            { user: { name: { contains: options.query, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [members, total] = await Promise.all([
    prisma.organizationMember.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
            identityProviderLinks: { where: { tenantId }, select: { id: true, provider: true, linkedAt: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
      take: pageSize,
      skip: (page - 1) * pageSize,
    }),
    prisma.organizationMember.count({ where }),
  ]);

  const userIds = members.map((member) => member.userId);
  const latestVerifications = await prisma.verificationRecord.findMany({
    where: {
      tenantId,
      userId: { in: userIds },
    },
    orderBy: [{ userId: "asc" }, { updatedAt: "desc" }],
    take: 200,
  });

  const latestByUser = new Map<string, (typeof latestVerifications)[number]>();
  for (const verification of latestVerifications) {
    if (verification.userId && !latestByUser.has(verification.userId)) {
      latestByUser.set(verification.userId, verification);
    }
  }

  return { members, latestVerificationByUser: latestByUser, total, page, pageSize };
}

export async function getOrganizationAgentsData(tenantId: string, orgId: string) {
  const [agents, apiKeys] = await Promise.all([
    prisma.agent.findMany({
      where: { tenantId, organizationId: orgId },
      include: {
        manager: { select: { id: true, name: true, email: true } },
        trustScores: { where: { isCurrent: true }, orderBy: { calculatedAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.apiKey.findMany({
      where: { tenantId, organizationId: orgId, agentId: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);
  return { agents, apiKeys };
}

export async function getOrganizationDomainsData(tenantId: string, orgId: string) {
  const [domains, verificationHistory] = await Promise.all([
    prisma.domainVerification.findMany({
      where: { organizationId: orgId, organization: { tenantId } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.verificationRecord.findMany({
      where: { tenantId, organizationId: orgId, verificationType: { in: ["DOMAIN", "ORGANIZATION"] } },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
  ]);
  return { domains, verificationHistory };
}

export async function getOrganizationAuditData(tenantId: string, orgId: string) {
  return getOrganizationAuditDataPaginated(tenantId, orgId, {});
}

export async function getOrganizationAuditDataPaginated(
  tenantId: string,
  orgId: string,
  options: {
    query?: string;
    outcome?: string;
    page?: number;
    pageSize?: number;
  },
) {
  const pageSize = options.pageSize ?? 20;
  const page = Math.max(1, options.page ?? 1);
  const where = {
    tenantId,
    OR: [{ resourceId: orgId }, { metadataJson: { path: ["organizationId"], equals: orgId } }],
    ...(options.outcome && options.outcome !== "ALL" ? { outcome: options.outcome } : {}),
    ...(options.query
      ? {
          actionType: { contains: options.query, mode: "insensitive" as const },
        }
      : {}),
  };

  const [auditLogs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        actorUser: { select: { id: true, name: true, email: true } },
        actorAgent: { select: { id: true, displayName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: pageSize,
      skip: (page - 1) * pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { auditLogs, total, page, pageSize };
}

export async function getAgentRegistryData(tenantId: string, agentId: string) {
  const [agent, credentials, trustScore, riskSignals, verifications, auditLogs, trustCard] = await Promise.all([
    prisma.agent.findFirst({
      where: { id: agentId, tenantId },
      include: {
        organization: {
          select: { id: true, name: true, slug: true },
        },
        manager: {
          select: { id: true, name: true, email: true },
        },
      },
    }),
    prisma.agentCredential.findMany({
      where: { tenantId, agentId },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.trustScore.findFirst({
      where: { tenantId, agentId, isCurrent: true },
      orderBy: { calculatedAt: "desc" },
    }),
    prisma.riskSignal.findMany({
      where: { tenantId, agentId, isActive: true },
      orderBy: { detectedAt: "desc" },
      take: 20,
    }),
    prisma.verificationRecord.findMany({
      where: { tenantId, agentId },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.auditLog.findMany({
      where: {
        tenantId,
        OR: [
          { actorAgentId: agentId },
          { resourceId: agentId },
          { metadataJson: { path: ["agentId"], equals: agentId } },
        ],
      },
      include: {
        actorUser: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.publicTrustProfile.findFirst({
      where: { tenantId, agentId },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return { agent, credentials, trustScore, riskSignals, verifications, auditLogs, trustCard };
}
