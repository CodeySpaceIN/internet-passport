"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@internet-passport/db";
import {
  getVerificationCenterAdapter,
  type VerificationCenterModule,
  verificationCenterModules,
} from "@internet-passport/verification-core";
import { recalculateAndPersistTrust } from "@internet-passport/trust-engine";
import { getServerSessionOrRedirect } from "@/lib/auth/server";
import { getTenantIdFromSession } from "@/lib/data/app-dashboard";
import { writeAuditAndSignedAction } from "@/lib/audit/service";

const moduleSet = new Set<string>(verificationCenterModules);

function toVerificationState(status: "pending" | "verified" | "failed" | "rejected" | "needs_review") {
  switch (status) {
    case "verified":
      return "PASSED" as const;
    case "failed":
      return "FAILED" as const;
    case "rejected":
      return "REJECTED" as const;
    case "needs_review":
      return "NEEDS_REVIEW" as const;
    case "pending":
    default:
      return "PENDING" as const;
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

async function createAuditLog(params: {
  tenantId: string;
  actorUserId: string;
  actionType: string;
  resourceType: string;
  resourceId?: string;
  outcome: "SUCCESS" | "FAILURE";
  metadataJson?: Record<string, unknown>;
  signPayload?: Record<string, unknown>;
  orgId?: string;
}) {
  await writeAuditAndSignedAction(
    {
      tenantId: params.tenantId,
      actor: { type: "USER", userId: params.actorUserId },
      actionType: params.actionType,
      targetType: params.resourceType,
      targetId: params.resourceId,
      outcome: params.outcome,
      metadata: params.metadataJson,
      orgId: params.orgId,
    },
    params.signPayload
      ? {
          actionType: params.actionType,
          targetType: params.resourceType,
          targetId: params.resourceId ?? "unknown",
          payload: params.signPayload,
          orgId: params.orgId,
        }
      : undefined,
  );
}

export async function startVerificationFlowAction(formData: FormData) {
  const session = await getServerSessionOrRedirect();
  const tenantId = getTenantIdFromSession(session);
  if (!tenantId) return;

  const requestedModule = String(formData.get("module") ?? "");
  if (!moduleSet.has(requestedModule)) {
    throw new Error("Unsupported verification module.");
  }
  const moduleKey = requestedModule as VerificationCenterModule;

  const detailsValue = String(formData.get("details") ?? "").trim();
  const targetHint = String(formData.get("targetHint") ?? "").trim();

  let userId: string | null = null;
  let organizationId: string | null = null;
  let agentId: string | null = null;

  if (moduleKey === "organization_domain_verification") {
    const organization =
      (await prisma.organization.findFirst({
        where: { tenantId },
        orderBy: { createdAt: "asc" },
      })) ??
      (await prisma.organization.create({
        data: {
          tenantId,
          ownerUserId: session.user.id,
          name: targetHint || "Verification Organization",
          slug: slugify(targetHint || "verification-organization"),
        },
      }));
    organizationId = organization.id;
  } else if (moduleKey === "ai_agent_registration") {
    const agent =
      (await prisma.agent.findFirst({
        where: { tenantId },
        orderBy: { createdAt: "asc" },
      })) ??
      (await prisma.agent.create({
        data: {
          tenantId,
          managerUserId: session.user.id,
          displayName: targetHint || "Verification Agent",
          slug: slugify(targetHint || `verification-agent-${Date.now()}`),
        },
      }));
    agentId = agent.id;
  } else {
    userId = session.user.id;
  }

  const adapter = getVerificationCenterAdapter(moduleKey);
  let record: { id: string } | null = null;
  try {
    record = await prisma.verificationRecord.create({
      data: {
        tenantId,
        userId,
        organizationId,
        agentId,
        requestedByUserId: session.user.id,
        verificationType:
          moduleKey === "human_verification"
            ? "LIVENESS"
            : moduleKey === "organization_domain_verification"
              ? "DOMAIN"
              : moduleKey === "ai_agent_registration"
                ? "AGENT_ATTESTATION"
                : "IDENTITY",
        provider:
          moduleKey === "organization_domain_verification"
            ? "INTERNAL"
            : moduleKey === "ai_agent_registration"
              ? "CUSTOM"
              : "MOCK",
        state: "DRAFT",
        evidenceJson: {
          module: moduleKey,
          details: detailsValue || null,
        },
      },
    });

  await createAuditLog({
    tenantId,
    actorUserId: session.user.id,
    actionType: "VERIFICATION_FLOW_STARTED",
    resourceType: "VerificationRecord",
    resourceId: record.id,
    outcome: "SUCCESS",
    metadataJson: { module: moduleKey },
    signPayload: { module: moduleKey, phase: "started" },
    orgId: organizationId ?? undefined,
  });

  await prisma.verificationRecord.update({
    where: { id: record.id },
    data: { state: "IN_PROGRESS" },
  });

  await createAuditLog({
    tenantId,
    actorUserId: session.user.id,
    actionType: "VERIFICATION_FLOW_IN_PROGRESS",
    resourceType: "VerificationRecord",
    resourceId: record.id,
    outcome: "SUCCESS",
    metadataJson: { module: moduleKey },
    signPayload: { module: moduleKey, phase: "in_progress" },
    orgId: organizationId ?? undefined,
  });

  const execution = await adapter.execute({
    tenantId,
    verificationRecordId: record.id,
    module: moduleKey,
    subjectRef: userId ?? organizationId ?? agentId ?? "unknown",
    initiatedByUserId: session.user.id,
    details: detailsValue ? { details: detailsValue } : undefined,
  });

  const nextState = toVerificationState(execution.status);
  const updated = await prisma.verificationRecord.update({
    where: { id: record.id },
    data: {
      verificationType: execution.verificationType,
      provider: execution.provider,
      state: nextState,
      confidenceScore: execution.confidenceScore,
      externalRef: execution.externalRef,
      evidenceJson: execution.evidence as any,
      completedAt: execution.status === "pending" ? null : new Date(),
    },
  });

  await createAuditLog({
    tenantId,
    actorUserId: session.user.id,
    actionType: "VERIFICATION_FLOW_COMPLETED",
    resourceType: "VerificationRecord",
    resourceId: record.id,
    outcome: execution.status === "failed" ? "FAILURE" : "SUCCESS",
    metadataJson: {
      module: moduleKey,
      finalStatus: execution.status,
      confidenceScore: execution.confidenceScore,
    },
    signPayload: {
      module: moduleKey,
      finalStatus: execution.status,
      confidenceScore: execution.confidenceScore,
    },
    orgId: organizationId ?? undefined,
  });

  const trustSummary = await recalculateAndPersistTrust({
    tenantId,
    actorUserId: session.user.id,
    trigger: "verification_completion",
    verificationRecordId: updated.id,
    ...(updated.userId ? { userId: updated.userId } : {}),
    ...(updated.organizationId ? { organizationId: updated.organizationId } : {}),
    ...(updated.agentId ? { agentId: updated.agentId } : {}),
  });

  await createAuditLog({
    tenantId,
    actorUserId: session.user.id,
    actionType: "TRUST_SCORE_RECALCULATED",
    resourceType: "TrustScore",
    resourceId: trustSummary.trustScore.id,
    outcome: "SUCCESS",
    metadataJson: {
      verificationRecordId: updated.id,
      module: moduleKey,
      trustTier: trustSummary.trustScore.tier,
      trustScore: trustSummary.trustScore.score,
      riskTier: trustSummary.riskTier,
      factors: trustSummary.factors,
    },
    signPayload: {
      verificationRecordId: updated.id,
      trustTier: trustSummary.trustScore.tier,
      trustScore: trustSummary.trustScore.score,
      riskTier: trustSummary.riskTier,
    },
    orgId: organizationId ?? undefined,
  });

  revalidatePath("/app/verifications");
  revalidatePath("/app");
  } catch (error) {
    await createAuditLog({
      tenantId,
      actorUserId: session.user.id,
      actionType: "VERIFICATION_FLOW_FAILED",
      resourceType: "VerificationRecord",
      resourceId: record?.id,
      outcome: "FAILURE",
      metadataJson: {
        module: moduleKey,
        error: error instanceof Error ? error.message : "unknown_error",
      },
      signPayload: {
        module: moduleKey,
        error: error instanceof Error ? error.message : "unknown_error",
      },
      orgId: organizationId ?? undefined,
    });
    throw error;
  }
}
