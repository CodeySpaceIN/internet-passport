import { prisma } from "@internet-passport/db";
import { getCurrentTrustSummary } from "@internet-passport/trust-engine";

export async function getAdminDashboardData(tenantId: string) {
  const [
    openReviews,
    openFlags,
    failedVerifications,
    suspiciousApi,
    recentAudit,
    activeUsers,
    activeOrgs,
    activeAgents,
  ] = await Promise.all([
    prisma.reviewCase.count({ where: { tenantId, status: { in: ["OPEN", "IN_REVIEW"] } } }),
    prisma.adminFlag.count({ where: { tenantId, status: { in: ["OPEN", "IN_REVIEW"] } } }),
    prisma.verificationRecord.count({ where: { tenantId, state: { in: ["FAILED", "REJECTED", "NEEDS_REVIEW"] } } }),
    prisma.apiRequestLog.count({
      where: { tenantId, outcome: { in: ["UNAUTHORIZED", "RATE_LIMITED", "SERVER_ERROR"] } },
    }),
    prisma.auditLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        actorUser: { select: { name: true, email: true } },
        actorAgent: { select: { displayName: true } },
      },
    }),
    prisma.user.count({ where: { deletedAt: null, memberships: { some: { tenantId } } } }),
    prisma.organization.count({ where: { tenantId, deletedAt: null } }),
    prisma.agent.count({ where: { tenantId, deletedAt: null } }),
  ]);

  return {
    kpis: {
      openReviews,
      openFlags,
      failedVerifications,
      suspiciousApi,
      activeUsers,
      activeOrgs,
      activeAgents,
    },
    recentAudit,
  };
}

export async function getReviewQueueData(
  tenantId: string,
  params: { status?: string; query?: string; page?: number; pageSize?: number },
) {
  const page = Math.max(1, params.page ?? 1);
  const take = Math.max(10, Math.min(100, params.pageSize ?? 20));
  const where = {
    tenantId,
    ...(params.status && params.status !== "ALL" ? { status: params.status as any } : {}),
    ...(params.query
      ? {
          OR: [
            { caseType: { contains: params.query, mode: "insensitive" as const } },
            { subject: { displayName: { contains: params.query, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.reviewCase.findMany({
      where,
      orderBy: { openedAt: "desc" },
      take,
      skip: (page - 1) * take,
      include: {
        subject: { select: { id: true, displayName: true, subjectType: true, status: true } },
        tasks: { orderBy: { createdAt: "desc" }, take: 3 },
        decisions: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    prisma.reviewCase.count({ where }),
  ]);

  return { items, total, page, take };
}

export async function getFlagsQueueData(
  tenantId: string,
  params: { status?: string; severity?: string; query?: string; page?: number; pageSize?: number },
) {
  const page = Math.max(1, params.page ?? 1);
  const take = Math.max(10, Math.min(100, params.pageSize ?? 20));
  const where = {
    tenantId,
    ...(params.status && params.status !== "ALL" ? { status: params.status as any } : {}),
    ...(params.severity && params.severity !== "ALL" ? { severity: params.severity as any } : {}),
    ...(params.query
      ? {
          OR: [
            { reasonCode: { contains: params.query, mode: "insensitive" as const } },
            { description: { contains: params.query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.adminFlag.findMany({
      where,
      orderBy: { raisedAt: "desc" },
      take,
      skip: (page - 1) * take,
      include: {
        user: { select: { id: true, name: true, email: true } },
        organization: { select: { id: true, name: true } },
        agent: { select: { id: true, displayName: true } },
      },
    }),
    prisma.adminFlag.count({ where }),
  ]);
  return { items, total, page, take };
}

export async function getAdminUsersData(tenantId: string, query?: string) {
  const users = await prisma.user.findMany({
    where: {
      memberships: { some: { tenantId } },
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 80,
    include: {
      trustScores: { where: { tenantId, isCurrent: true }, orderBy: { calculatedAt: "desc" }, take: 1 },
      verificationRecords: { where: { tenantId }, orderBy: { createdAt: "desc" }, take: 5 },
      auditLogsAsActor: { where: { tenantId }, orderBy: { createdAt: "desc" }, take: 5 },
    },
  });
  return users;
}

export async function getAdminOrganizationsData(tenantId: string, query?: string) {
  const organizations = await prisma.organization.findMany({
    where: {
      tenantId,
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { slug: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 80,
    include: {
      trustScores: { where: { isCurrent: true }, orderBy: { calculatedAt: "desc" }, take: 1 },
      verificationRecords: { orderBy: { createdAt: "desc" }, take: 5 },
      domains: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });
  return organizations;
}

export async function getAdminAgentsData(tenantId: string, query?: string) {
  const agents = await prisma.agent.findMany({
    where: {
      tenantId,
      ...(query
        ? {
            OR: [
              { displayName: { contains: query, mode: "insensitive" } },
              { slug: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 80,
    include: {
      trustScores: { where: { isCurrent: true }, orderBy: { calculatedAt: "desc" }, take: 1 },
      verificationRecords: { orderBy: { createdAt: "desc" }, take: 5 },
      auditLogs: { where: { tenantId }, orderBy: { createdAt: "desc" }, take: 5 },
    },
  });
  return agents;
}

export async function getAdminAuditData(
  tenantId: string,
  params: { query?: string; outcome?: string; page?: number; pageSize?: number },
) {
  const page = Math.max(1, params.page ?? 1);
  const take = Math.max(10, Math.min(100, params.pageSize ?? 25));
  const where = {
    tenantId,
    ...(params.outcome && params.outcome !== "ALL" ? { outcome: params.outcome } : {}),
    ...(params.query
      ? {
          OR: [
            { actionType: { contains: params.query, mode: "insensitive" as const } },
            { resourceType: { contains: params.query, mode: "insensitive" as const } },
            { resourceId: { contains: params.query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      skip: (page - 1) * take,
      include: {
        actorUser: { select: { id: true, name: true, email: true } },
        actorAgent: { select: { id: true, displayName: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);
  return { items, total, page, take };
}

export async function getTrustSummaryForTarget(tenantId: string, target: { userId?: string; organizationId?: string; agentId?: string }) {
  return getCurrentTrustSummary({
    tenantId,
    ...(target.userId ? { userId: target.userId } : {}),
    ...(target.organizationId ? { organizationId: target.organizationId } : {}),
    ...(target.agentId ? { agentId: target.agentId } : {}),
  });
}
