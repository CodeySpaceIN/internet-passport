"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@internet-passport/db";
import { recalculateAndPersistTrust } from "@internet-passport/trust-engine";
import { requirePermission } from "@/lib/auth/server";
import { getTenantIdFromSession } from "@/lib/data/app-dashboard";
import { writeAuditAndSignedAction } from "@/lib/audit/service";

function readNumber(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function buildConfigOverride(formData: FormData) {
  return {
    version: String(formData.get("engineVersion") ?? "").trim() || undefined,
    weights: {
      emailVerified: readNumber(formData, "w_emailVerified"),
      githubLinked: readNumber(formData, "w_githubLinked"),
      humanVerified: readNumber(formData, "w_humanVerified"),
      phoneVerified: readNumber(formData, "w_phoneVerified"),
      organizationVerified: readNumber(formData, "w_organizationVerified"),
      suspiciousActivityFlags: readNumber(formData, "w_suspiciousActivityFlags"),
      repeatedFailedVerificationAttempts: readNumber(formData, "w_repeatedFailedVerificationAttempts"),
      accountAgeDays: readNumber(formData, "w_accountAgeDays"),
      adminReviewOpen: readNumber(formData, "w_adminReviewOpen"),
      linkedTrustedIdentities: readNumber(formData, "w_linkedTrustedIdentities"),
      negativeEventsOrSuspensions: readNumber(formData, "w_negativeEventsOrSuspensions"),
    },
    thresholds: {
      lowRiskMinScore: readNumber(formData, "t_lowRiskMinScore"),
      mediumRiskMinScore: readNumber(formData, "t_mediumRiskMinScore"),
      highRiskMinScore: readNumber(formData, "t_highRiskMinScore"),
      maxScore: readNumber(formData, "t_maxScore"),
      minScore: readNumber(formData, "t_minScore"),
    },
  };
}

export async function recalculateTrustFromAdminAction(formData: FormData) {
  const session = await requirePermission("admin:access");
  const tenantId = getTenantIdFromSession(session);
  if (!tenantId) return;

  const userId = String(formData.get("userId") ?? "").trim();
  const organizationId = String(formData.get("organizationId") ?? "").trim();
  const agentId = String(formData.get("agentId") ?? "").trim();
  if (!userId && !organizationId && !agentId) {
    throw new Error("Provide userId, organizationId, or agentId.");
  }

  await recalculateAndPersistTrust({
    tenantId,
    actorUserId: session.user.id,
    trigger: "manual",
    ...(userId ? { userId } : {}),
    ...(organizationId ? { organizationId } : {}),
    ...(agentId ? { agentId } : {}),
    configOverride: buildConfigOverride(formData),
  });

  revalidatePath("/admin");
  revalidatePath("/app");
}

function readString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function assertReviewTransition(current: string, next: string) {
  const transitions: Record<string, string[]> = {
    OPEN: ["IN_REVIEW", "CLOSED"],
    IN_REVIEW: ["DECIDED", "CLOSED"],
    DECIDED: ["CLOSED", "IN_REVIEW"],
    CLOSED: ["OPEN"],
  };
  return transitions[current]?.includes(next) ?? false;
}

export async function transitionReviewCaseAction(formData: FormData) {
  const session = await requirePermission("admin:access");
  const tenantId = getTenantIdFromSession(session);
  if (!tenantId) return;

  const reviewCaseId = readString(formData, "reviewCaseId");
  const nextStatus = readString(formData, "nextStatus");
  const note = readString(formData, "note");
  if (!reviewCaseId || !nextStatus) {
    throw new Error("Missing review case transition input.");
  }

  const reviewCase = await prisma.reviewCase.findFirst({
    where: { id: reviewCaseId, tenantId },
  });
  if (!reviewCase) {
    throw new Error("Review case not found.");
  }
  if (!assertReviewTransition(reviewCase.status, nextStatus)) {
    throw new Error(`Invalid status transition: ${reviewCase.status} -> ${nextStatus}`);
  }

  const updated = await prisma.reviewCase.update({
    where: { id: reviewCase.id },
    data: {
      status: nextStatus as any,
      ...(nextStatus === "CLOSED" ? { closedAt: new Date() } : {}),
    },
  });

  await writeAuditAndSignedAction(
    {
      tenantId,
      actor: { type: "USER", userId: session.user.id },
      actionType: "ADMIN_REVIEW_STATUS_UPDATED",
      targetType: "ReviewCase",
      targetId: updated.id,
      outcome: "SUCCESS",
      metadata: { from: reviewCase.status, to: nextStatus, note: note || null },
    },
    {
      actionType: "ADMIN_REVIEW_STATUS_UPDATED",
      targetType: "ReviewCase",
      targetId: updated.id,
      payload: { from: reviewCase.status, to: nextStatus, note: note || null },
      contextType: "admin_review",
    },
  );

  revalidatePath("/admin/reviews");
  revalidatePath("/admin");
}

export async function submitReviewDecisionAction(formData: FormData) {
  const session = await requirePermission("admin:access");
  const tenantId = getTenantIdFromSession(session);
  if (!tenantId) return;

  const reviewCaseId = readString(formData, "reviewCaseId");
  const decision = readString(formData, "decision");
  const rationale = readString(formData, "rationale");
  if (!reviewCaseId || !decision || !rationale) {
    throw new Error("Missing decision inputs.");
  }

  const reviewCase = await prisma.reviewCase.findFirst({
    where: { id: reviewCaseId, tenantId },
  });
  if (!reviewCase) {
    throw new Error("Review case not found.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.reviewDecision.create({
      data: {
        reviewCaseId: reviewCase.id,
        deciderUserId: session.user.id,
        decision,
        rationale,
      },
    });
    await tx.reviewTask.updateMany({
      where: { reviewCaseId: reviewCase.id, status: { in: ["OPEN", "IN_PROGRESS"] } },
      data: { status: "COMPLETED" },
    });
    await tx.reviewCase.update({
      where: { id: reviewCase.id },
      data: { status: "DECIDED" },
    });
  });

  await writeAuditAndSignedAction(
    {
      tenantId,
      actor: { type: "USER", userId: session.user.id },
      actionType: "ADMIN_REVIEW_DECISION_SUBMITTED",
      targetType: "ReviewCase",
      targetId: reviewCase.id,
      outcome: "SUCCESS",
      metadata: { decision, rationale },
    },
    {
      actionType: "ADMIN_REVIEW_DECISION_SUBMITTED",
      targetType: "ReviewCase",
      targetId: reviewCase.id,
      payload: { decision, rationale },
      contextType: "admin_review",
    },
  );

  revalidatePath("/admin/reviews");
  revalidatePath("/admin");
}

export async function resolveFlagAction(formData: FormData) {
  const session = await requirePermission("admin:access");
  const tenantId = getTenantIdFromSession(session);
  if (!tenantId) return;

  const flagId = readString(formData, "flagId");
  const status = readString(formData, "status") || "RESOLVED";
  const note = readString(formData, "note");
  if (!flagId) {
    throw new Error("Missing flag id.");
  }

  const flag = await prisma.adminFlag.findFirst({ where: { id: flagId, tenantId } });
  if (!flag) {
    throw new Error("Flag not found.");
  }

  const updated = await prisma.adminFlag.update({
    where: { id: flag.id },
    data: {
      status: status as any,
      resolvedAt: new Date(),
      resolvedByUserId: session.user.id,
      metadataJson: {
        ...(typeof flag.metadataJson === "object" && flag.metadataJson ? (flag.metadataJson as Record<string, unknown>) : {}),
        adminNote: note || null,
      } as any,
    },
  });

  await writeAuditAndSignedAction(
    {
      tenantId,
      actor: { type: "USER", userId: session.user.id },
      actionType: "ADMIN_FLAG_STATUS_UPDATED",
      targetType: "AdminFlag",
      targetId: updated.id,
      outcome: "SUCCESS",
      metadata: { status, note: note || null, reasonCode: updated.reasonCode },
      orgId: updated.organizationId ?? undefined,
    },
    {
      actionType: "ADMIN_FLAG_STATUS_UPDATED",
      targetType: "AdminFlag",
      targetId: updated.id,
      payload: { status, note: note || null, reasonCode: updated.reasonCode },
      contextType: "admin_flag",
      orgId: updated.organizationId ?? undefined,
    },
  );

  revalidatePath("/admin/flags");
  revalidatePath("/admin");
}

async function writeSuspendRestoreAudit(params: {
  tenantId: string;
  actorUserId: string;
  entityType: "User" | "Organization" | "Agent";
  entityId: string;
  actionType: string;
  reason?: string;
}) {
  await writeAuditAndSignedAction(
    {
      tenantId: params.tenantId,
      actor: { type: "USER", userId: params.actorUserId },
      actionType: params.actionType,
      targetType: params.entityType,
      targetId: params.entityId,
      outcome: "SUCCESS",
      metadata: { reason: params.reason ?? null },
    },
    {
      actionType: params.actionType,
      targetType: params.entityType,
      targetId: params.entityId,
      payload: { reason: params.reason ?? null },
      contextType: "admin_entity_control",
    },
  );
}

export async function suspendEntityAction(formData: FormData) {
  const session = await requirePermission("admin:access");
  const tenantId = getTenantIdFromSession(session);
  if (!tenantId) return;

  const entityType = readString(formData, "entityType");
  const entityId = readString(formData, "entityId");
  const reason = readString(formData, "reason");

  if (entityType === "user") {
    await prisma.user.update({ where: { id: entityId }, data: { deletedAt: new Date() } });
    await writeSuspendRestoreAudit({
      tenantId,
      actorUserId: session.user.id,
      entityType: "User",
      entityId,
      actionType: "ADMIN_USER_SUSPENDED",
      reason,
    });
  } else if (entityType === "org") {
    await prisma.organization.update({
      where: { id: entityId },
      data: { status: "SUSPENDED" },
    });
    await writeSuspendRestoreAudit({
      tenantId,
      actorUserId: session.user.id,
      entityType: "Organization",
      entityId,
      actionType: "ADMIN_ORG_SUSPENDED",
      reason,
    });
  } else if (entityType === "agent") {
    await prisma.agent.update({
      where: { id: entityId },
      data: { status: "PAUSED" },
    });
    await writeSuspendRestoreAudit({
      tenantId,
      actorUserId: session.user.id,
      entityType: "Agent",
      entityId,
      actionType: "ADMIN_AGENT_SUSPENDED",
      reason,
    });
  } else {
    throw new Error("Unsupported entity type.");
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/orgs");
  revalidatePath("/admin/agents");
  revalidatePath("/admin");
}

export async function restoreEntityAction(formData: FormData) {
  const session = await requirePermission("admin:access");
  const tenantId = getTenantIdFromSession(session);
  if (!tenantId) return;

  const entityType = readString(formData, "entityType");
  const entityId = readString(formData, "entityId");
  const reason = readString(formData, "reason");

  if (entityType === "user") {
    await prisma.user.update({ where: { id: entityId }, data: { deletedAt: null } });
    await writeSuspendRestoreAudit({
      tenantId,
      actorUserId: session.user.id,
      entityType: "User",
      entityId,
      actionType: "ADMIN_USER_RESTORED",
      reason,
    });
  } else if (entityType === "org") {
    await prisma.organization.update({
      where: { id: entityId },
      data: { status: "ACTIVE" },
    });
    await writeSuspendRestoreAudit({
      tenantId,
      actorUserId: session.user.id,
      entityType: "Organization",
      entityId,
      actionType: "ADMIN_ORG_RESTORED",
      reason,
    });
  } else if (entityType === "agent") {
    await prisma.agent.update({
      where: { id: entityId },
      data: { status: "ACTIVE" },
    });
    await writeSuspendRestoreAudit({
      tenantId,
      actorUserId: session.user.id,
      entityType: "Agent",
      entityId,
      actionType: "ADMIN_AGENT_RESTORED",
      reason,
    });
  } else {
    throw new Error("Unsupported entity type.");
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/orgs");
  revalidatePath("/admin/agents");
  revalidatePath("/admin");
}
