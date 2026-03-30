import { prisma } from "@internet-passport/db";
import { scoreTrust, type TrustScoringInputs } from "./scoring-engine";
import type { TrustEngineConfigOverride } from "./rules-config";

export type TrustTargetRef = {
  tenantId: string;
  userId?: string;
  organizationId?: string;
  agentId?: string;
};

export type RecalculateTrustInput = TrustTargetRef & {
  actorUserId?: string;
  trigger: "verification_completion" | "admin_action" | "manual";
  verificationRecordId?: string;
  configOverride?: TrustEngineConfigOverride;
};

function tierFromScore(score: number) {
  if (score >= 90) return "VERIFIED" as const;
  if (score >= 75) return "HIGH" as const;
  if (score >= 55) return "MEDIUM" as const;
  if (score >= 35) return "LOW" as const;
  return "UNTRUSTED" as const;
}

function compactExplanations(values: string[]): string[] {
  return values.filter(Boolean).slice(0, 12);
}

function withTargetWhere(input: TrustTargetRef) {
  return {
    tenantId: input.tenantId,
    ...(input.userId ? { userId: input.userId } : {}),
    ...(input.organizationId ? { organizationId: input.organizationId } : {}),
    ...(input.agentId ? { agentId: input.agentId } : {}),
  };
}

export async function buildTrustInputsForTarget(target: TrustTargetRef): Promise<TrustScoringInputs> {
  const [verifications, flags, signals, recentAuditFailures, user, organization, agent, identityLinks] =
    await Promise.all([
      prisma.verificationRecord.findMany({
        where: withTargetWhere(target),
        orderBy: { createdAt: "desc" },
        take: 120,
      }),
      prisma.adminFlag.findMany({
        where: {
          ...withTargetWhere(target),
          status: { in: ["OPEN", "IN_REVIEW"] },
        },
        take: 50,
      }),
      prisma.riskSignal.findMany({
        where: {
          ...withTargetWhere(target),
          isActive: true,
        },
        take: 100,
      }),
      prisma.auditLog.count({
        where: {
          ...withTargetWhere(target),
          outcome: "FAILURE",
          createdAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30) },
        },
      }),
      target.userId ? prisma.user.findUnique({ where: { id: target.userId } }) : Promise.resolve(null),
      target.organizationId ? prisma.organization.findUnique({ where: { id: target.organizationId } }) : Promise.resolve(null),
      target.agentId ? prisma.agent.findUnique({ where: { id: target.agentId } }) : Promise.resolve(null),
      target.userId
        ? prisma.identityProviderLink.findMany({
            where: { tenantId: target.tenantId, userId: target.userId },
          })
        : Promise.resolve([]),
    ]);

  const passedIdentity = verifications.some((item) => item.state === "PASSED" && item.verificationType === "IDENTITY");
  const passedHuman = verifications.some((item) => item.state === "PASSED" && item.verificationType === "LIVENESS");
  const passedPhone = verifications.some(
    (item) =>
      item.state === "PASSED" &&
      item.verificationType === "IDENTITY" &&
      typeof item.evidenceJson === "object" &&
      item.evidenceJson !== null &&
      "module" in (item.evidenceJson as Record<string, unknown>) &&
      (item.evidenceJson as Record<string, unknown>).module === "phone_verification_placeholder",
  );
  const orgVerified = verifications.some(
    (item) =>
      item.state === "PASSED" &&
      (item.verificationType === "ORGANIZATION" || item.verificationType === "DOMAIN"),
  );
  const failedAttempts = verifications.filter((item) => item.state === "FAILED" || item.state === "REJECTED").length;
  const githubLinked = identityLinks.some((item) => item.provider === "GITHUB");
  const linkedTrustedIdentities = identityLinks.filter((item) =>
    ["EMAIL", "GITHUB", "GOOGLE", "MICROSOFT", "APPLE"].includes(item.provider),
  ).length;
  const suspiciousCount = signals.filter((item) => item.severity === "MEDIUM" || item.severity === "HIGH" || item.severity === "CRITICAL").length;
  const adminReviewOpen = flags.length > 0 || verifications.some((item) => item.state === "NEEDS_REVIEW");
  const accountCreatedAt = user?.createdAt ?? organization?.createdAt ?? agent?.createdAt ?? new Date();
  const accountAgeDays = Math.floor((Date.now() - accountCreatedAt.getTime()) / (1000 * 60 * 60 * 24));
  const negativeSignalsFromStatus =
    (organization?.status === "SUSPENDED" ? 1 : 0) +
    (user?.deletedAt ? 1 : 0) +
    (agent?.status === "PAUSED" || agent?.status === "REVOKED" ? 1 : 0);

  return {
    emailVerified: passedIdentity,
    githubLinked,
    humanVerified: passedHuman,
    phoneVerified: passedPhone,
    organizationVerified: orgVerified,
    suspiciousActivityFlags: suspiciousCount,
    repeatedFailedVerificationAttempts: failedAttempts,
    accountAgeDays,
    adminReviewOpen,
    linkedTrustedIdentities,
    negativeEventsOrSuspensions: recentAuditFailures + negativeSignalsFromStatus,
  };
}

export async function recalculateAndPersistTrust(input: RecalculateTrustInput) {
  const inputs = await buildTrustInputsForTarget(input);
  const result = scoreTrust(inputs, input.configOverride);
  const trustTier = tierFromScore(result.score);
  const reasonCodes = compactExplanations(result.factors.map((factor) => `${factor.key}: ${factor.explanation}`));

  const created = await prisma.$transaction(async (tx) => {
    await tx.trustScore.updateMany({
      where: {
        tenantId: input.tenantId,
        isCurrent: true,
        ...(input.userId ? { userId: input.userId } : { userId: null }),
        ...(input.organizationId ? { organizationId: input.organizationId } : { organizationId: null }),
        ...(input.agentId ? { agentId: input.agentId } : { agentId: null }),
      },
      data: { isCurrent: false },
    });

    const score = await tx.trustScore.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId ?? null,
        organizationId: input.organizationId ?? null,
        agentId: input.agentId ?? null,
        verificationRecordId: input.verificationRecordId ?? null,
        score: result.score,
        tier: trustTier,
        reasonCodes,
        isCurrent: true,
      },
    });

    if (result.riskTier === "high") {
      await tx.riskSignal.create({
        data: {
          tenantId: input.tenantId,
          userId: input.userId ?? null,
          organizationId: input.organizationId ?? null,
          agentId: input.agentId ?? null,
          verificationRecordId: input.verificationRecordId ?? null,
          signalType: inputs.repeatedFailedVerificationAttempts >= 3 ? "VELOCITY_ANOMALY" : "IP_REPUTATION_BAD",
          severity: "HIGH",
          scoreDelta: -18,
          isActive: true,
          evidenceJson: {
            trigger: input.trigger,
            riskTier: result.riskTier,
            suspiciousFlags: inputs.suspiciousActivityFlags,
            failedAttempts: inputs.repeatedFailedVerificationAttempts,
            negativeEventsOrSuspensions: inputs.negativeEventsOrSuspensions,
          },
        },
      });
    }

    if (input.actorUserId) {
      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorUserId: input.actorUserId,
          actionType: "TRUST_ENGINE_RECALCULATED",
          resourceType: "TrustScore",
          resourceId: score.id,
          outcome: "SUCCESS",
          metadataJson: {
            trigger: input.trigger,
            configVersion: result.configVersion,
            riskTier: result.riskTier,
            featuresHash: result.featuresHash,
            factors: result.factors,
          },
        },
      });
    }

    return score;
  });

  return {
    trustScore: created,
    riskTier: result.riskTier,
    factors: result.factors,
    inputs,
    featuresHash: result.featuresHash,
    configVersion: result.configVersion,
  };
}

export async function getCurrentTrustSummary(target: TrustTargetRef) {
  const [trustScore, activeSignals] = await Promise.all([
    prisma.trustScore.findFirst({
      where: { ...withTargetWhere(target), isCurrent: true },
      orderBy: { calculatedAt: "desc" },
    }),
    prisma.riskSignal.findMany({
      where: { ...withTargetWhere(target), isActive: true },
      orderBy: { detectedAt: "desc" },
      take: 10,
    }),
  ]);

  const fallbackRiskTier = trustScore
    ? trustScore.score >= 75
      ? "low"
      : trustScore.score >= 45
        ? "medium"
        : "high"
    : "high";

  return {
    trustScore,
    riskTier: activeSignals.some((signal) => signal.severity === "CRITICAL" || signal.severity === "HIGH")
      ? "high"
      : fallbackRiskTier,
    activeSignals,
    explanations: trustScore?.reasonCodes ?? [],
  };
}
