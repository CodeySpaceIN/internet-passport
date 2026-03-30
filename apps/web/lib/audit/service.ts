import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { prisma } from "@internet-passport/db";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

type AuditActor =
  | { type: "USER"; userId: string }
  | { type: "AGENT"; agentId: string }
  | { type: "API_KEY"; apiKeyId: string }
  | { type: "SYSTEM" };

type WriteAuditInput = {
  tenantId: string;
  actor: AuditActor;
  targetType: string;
  targetId?: string | null;
  actionType: string;
  outcome?: "SUCCESS" | "FAILURE";
  orgId?: string;
  metadata?: Record<string, unknown>;
};

type WriteSignedActionInput = {
  tenantId: string;
  actor: AuditActor;
  actionType: string;
  targetType: string;
  targetId: string;
  payload: Record<string, unknown>;
  contextType?: string;
  orgId?: string;
};

const SECRET_RE = /(token|secret|password|key|hash|signature|credential)/i;

function toSafeJson(value: unknown): JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => toSafeJson(item));
  }
  if (typeof value === "object") {
    const out: Record<string, JsonValue> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (SECRET_RE.test(key)) {
        out[key] = "[REDACTED]";
      } else {
        out[key] = toSafeJson(item);
      }
    }
    return out;
  }
  return String(value);
}

async function readRequestContext() {
  try {
    const requestHeaders = await headers();
    const requestId = requestHeaders.get("x-request-id");
    const userAgent = requestHeaders.get("user-agent");
    const forwardedFor = requestHeaders.get("x-forwarded-for");
    const ipAddress = forwardedFor?.split(",")[0]?.trim() ?? null;
    return { requestId, userAgent, ipAddress };
  } catch {
    return { requestId: null, userAgent: null, ipAddress: null };
  }
}

async function ensureSubjectForActor(tenantId: string, actor: AuditActor) {
  if (actor.type === "USER") {
    const user = await prisma.user.findUnique({
      where: { id: actor.userId },
      select: { id: true, name: true, email: true },
    });
    const displayName = user?.name ?? user?.email ?? `user_${actor.userId}`;
    return (
      (await prisma.subject.findFirst({
        where: {
          tenantId,
          subjectType: "HUMAN",
          displayName,
        },
      })) ??
      (await prisma.subject.create({
        data: {
          tenantId,
          subjectType: "HUMAN",
          displayName,
          status: "ACTIVE",
        },
      }))
    );
  }

  if (actor.type === "AGENT") {
    const agent = await prisma.agent.findUnique({
      where: { id: actor.agentId },
      select: { id: true, displayName: true },
    });
    const displayName = agent?.displayName ?? `agent_${actor.agentId}`;
    return (
      (await prisma.subject.findFirst({
        where: {
          tenantId,
          subjectType: "AGENT",
          displayName,
        },
      })) ??
      (await prisma.subject.create({
        data: {
          tenantId,
          subjectType: "AGENT",
          displayName,
          status: "ACTIVE",
        },
      }))
    );
  }

  return (
    (await prisma.subject.findFirst({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
    })) ??
    (await prisma.subject.create({
      data: {
        tenantId,
        subjectType: "DEVELOPER",
        displayName: "system",
        status: "ACTIVE",
      },
    }))
  );
}

export async function writeAuditRecord(input: WriteAuditInput) {
  const context = await readRequestContext();
  const metadata = toSafeJson({
    ...(input.metadata ?? {}),
    organizationId: input.orgId ?? null,
  });

  return prisma.auditLog.create({
    data: {
      tenantId: input.tenantId,
      actorUserId: input.actor.type === "USER" ? input.actor.userId : null,
      actorAgentId: input.actor.type === "AGENT" ? input.actor.agentId : null,
      actorApiKeyId: input.actor.type === "API_KEY" ? input.actor.apiKeyId : null,
      actionType: input.actionType,
      resourceType: input.targetType,
      resourceId: input.targetId ?? null,
      requestId: context.requestId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      outcome: input.outcome ?? "SUCCESS",
      metadataJson: metadata as any,
    },
  });
}

export async function recordSignedActionPlaceholder(input: WriteSignedActionInput) {
  const subject = await ensureSubjectForActor(input.tenantId, input.actor);
  const canonicalPayload = toSafeJson({
    actionType: input.actionType,
    targetType: input.targetType,
    targetId: input.targetId,
    payload: input.payload,
    organizationId: input.orgId ?? null,
  });
  const payloadString = JSON.stringify(canonicalPayload);
  const payloadHash = createHash("sha256").update(payloadString).digest("hex");
  const nonce = randomBytes(16).toString("hex");
  const signature = createHash("sha256")
    .update(`placeholder:${payloadHash}:${nonce}`)
    .digest("hex");

  return prisma.signedAction.create({
    data: {
      tenantId: input.tenantId,
      subjectId: subject.id,
      actorAgentId: input.actor.type === "AGENT" ? input.actor.agentId : null,
      contextType: input.contextType ?? "web_app",
      actionType: input.actionType,
      resourceType: input.targetType,
      resourceId: input.targetId,
      payloadHash,
      nonce,
      signature,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      verificationStatus: "PENDING",
    },
  });
}

export async function writeAuditAndSignedAction(
  audit: WriteAuditInput,
  signed?: Omit<WriteSignedActionInput, "tenantId" | "actor">,
) {
  const auditRecord = await writeAuditRecord(audit);
  if (!signed) {
    return { auditRecord, signedAction: null };
  }
  const signedAction = await recordSignedActionPlaceholder({
    tenantId: audit.tenantId,
    actor: audit.actor,
    actionType: signed.actionType,
    targetType: signed.targetType,
    targetId: signed.targetId,
    payload: signed.payload,
    contextType: signed.contextType,
    orgId: signed.orgId,
  });
  return { auditRecord, signedAction };
}
