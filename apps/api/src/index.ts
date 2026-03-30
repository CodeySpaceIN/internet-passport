import "dotenv/config";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import { compare, hash } from "bcryptjs";
import { randomBytes, createHash, createHmac } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";
import { Queue } from "bullmq";
import { prisma } from "@internet-passport/db";
import {
  getQueueConnection,
  VERIFICATION_QUEUE_NAME,
  WEBHOOK_QUEUE_NAME,
  type VerificationJobPayload,
  type WebhookDeliveryJobPayload,
} from "@internet-passport/queue";
import {
  evaluateTrust,
  getCurrentTrustSummary,
  recalculateAndPersistTrust,
} from "@internet-passport/trust-engine";
import { apiEnv } from "./config/env.js";
import { apiLogger } from "./logging/logger.js";
import { requestIdMiddleware } from "./middleware/request-id.js";

const app = Fastify({
  logger: true,
});

const allowedOrigins = apiEnv.ALLOWED_ORIGINS
  ? apiEnv.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean)
  : [];

await app.register(cors, {
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error("Origin not allowed by CORS policy"), false);
  },
});
await app.register(rateLimit, {
  global: true,
  max: 300,
  timeWindow: "1 minute",
});
app.addHook("onRequest", requestIdMiddleware);
app.addHook("onSend", async (_request, reply, payload) => {
  reply.header("x-content-type-options", "nosniff");
  reply.header("x-frame-options", "DENY");
  reply.header("referrer-policy", "strict-origin-when-cross-origin");
  return payload;
});
app.addHook("onResponse", async (request, reply) => {
  apiLogger
    .child({
      requestId: (request as any).requestId ?? null,
      method: request.method,
      path: request.url,
    })
    .info("request.completed", {
      statusCode: reply.statusCode,
      userAgent: request.headers["user-agent"] ?? null,
    });
});
const verificationQueue = new Queue<VerificationJobPayload>(VERIFICATION_QUEUE_NAME, {
  connection: getQueueConnection(),
});
const webhookQueue = new Queue<WebhookDeliveryJobPayload>(WEBHOOK_QUEUE_NAME, {
  connection: getQueueConnection(),
});

const roleSchema = z.enum(["OWNER", "ADMIN", "TRUST_REVIEWER", "DEVELOPER", "ANALYST"]);

const bootstrapSchema = z.object({
  tenantName: z.string().min(2),
  tenantSlug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  userName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  tenantSlug: z.string().min(2).regex(/^[a-z0-9-]+$/).optional(),
});

const apiKeySchema = z.object({
  name: z.string().min(2),
  scopes: z.array(z.string()).min(1),
});

const subjectCreateSchema = z.object({
  subjectType: z.enum(["HUMAN", "DEVELOPER", "ORG", "AGENT"]),
  displayName: z.string().min(2),
  workspaceId: z.string().optional(),
});

const verificationCreateSchema = z.object({
  subjectId: z.string().min(1),
  verificationType: z.string().min(2),
  provider: z.string().min(2).default("mock-provider"),
});

const policyCreateSchema = z.object({
  name: z.string().min(2),
  contextType: z.string().min(2),
  definition: z.object({
    allowThreshold: z.number().min(0).max(100),
    stepUpThreshold: z.number().min(0).max(100),
    reviewThreshold: z.number().min(0).max(100),
  }),
  isActive: z.boolean().default(true),
});

const trustEvaluateSchema = z.object({
  subjectId: z.string().min(1),
  contextType: z.string().min(2),
  actionType: z.string().min(2),
});

const trustSimulateSchema = z.object({
  subjectId: z.string().min(1),
  contextType: z.string().min(2),
  actionType: z.string().min(2),
  policyDefinition: z
    .object({
      allowThreshold: z.number().min(0).max(100),
      stepUpThreshold: z.number().min(0).max(100),
      reviewThreshold: z.number().min(0).max(100),
    })
    .optional(),
});

const trustTargetSchema = z
  .object({
    userId: z.string().min(1).optional(),
    organizationId: z.string().min(1).optional(),
    agentId: z.string().min(1).optional(),
  })
  .refine((value) => Boolean(value.userId || value.organizationId || value.agentId), {
    message: "One of userId, organizationId, or agentId is required.",
  });

const trustEngineConfigOverrideSchema = z.object({
  version: z.string().optional(),
  weights: z
    .object({
      emailVerified: z.number().optional(),
      githubLinked: z.number().optional(),
      humanVerified: z.number().optional(),
      phoneVerified: z.number().optional(),
      organizationVerified: z.number().optional(),
      suspiciousActivityFlags: z.number().optional(),
      repeatedFailedVerificationAttempts: z.number().optional(),
      accountAgeDays: z.number().optional(),
      adminReviewOpen: z.number().optional(),
      linkedTrustedIdentities: z.number().optional(),
      negativeEventsOrSuspensions: z.number().optional(),
    })
    .optional(),
  thresholds: z
    .object({
      lowRiskMinScore: z.number().optional(),
      mediumRiskMinScore: z.number().optional(),
      highRiskMinScore: z.number().optional(),
      maxScore: z.number().optional(),
      minScore: z.number().optional(),
    })
    .optional(),
});

const trustRecalculateSchema = trustTargetSchema.and(
  z.object({
    engineConfig: trustEngineConfigOverrideSchema.optional(),
  }),
);

const adminFlagResolveSchema = z.object({
  status: z.enum(["RESOLVED", "DISMISSED"]).default("RESOLVED"),
  note: z.string().max(500).optional(),
});

const actionSignSchema = z.object({
  subjectId: z.string().min(1),
  agentSubjectId: z.string().optional(),
  contextType: z.string().min(2),
  actionType: z.string().min(2),
  resourceType: z.string().min(2),
  resourceId: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
  decisionRefId: z.string().optional(),
  ttlSeconds: z.number().int().min(30).max(3600).default(600),
});

const actionVerifySchema = z.object({
  actionId: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
});

const reviewCaseCreateSchema = z.object({
  subjectId: z.string().min(1),
  caseType: z.string().min(2),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
});

const reviewAssignSchema = z.object({
  reviewTaskId: z.string().min(1),
  assignedToUserId: z.string().min(1),
});

const reviewDecisionSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT", "ESCALATE"]),
  rationale: z.string().min(4),
});

const trustCardCreateSchema = z.object({
  subjectId: z.string().min(1),
  slug: z.string().min(3).regex(/^[a-z0-9-]+$/),
  headline: z.string().min(3).max(120).optional(),
  summary: z.string().max(500).optional(),
});

const webhookCreateSchema = z.object({
  url: z.string().url(),
  signingSecret: z.string().min(12),
  subscribedEvents: z.array(z.string().min(2)).min(1),
});

const developerApiKeyCreateSchema = z.object({
  name: z.string().min(2),
  scopes: z.array(z.string().min(1)).min(1),
  organizationId: z.string().min(1).optional(),
  agentId: z.string().min(1).optional(),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

const developerTrustCheckSchema = z.object({
  targetType: z.enum(["user", "organization", "agent"]),
  targetId: z.string().min(1),
  contextType: z.string().min(2).default("developer_api"),
  actionType: z.string().min(2).default("trust_check"),
});

const developerSignedActionValidateSchema = z.object({
  actionId: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
});

const organizationCreateSchema = z.object({
  name: z.string().min(2).max(120),
  legalName: z.string().max(160).optional(),
  websiteUrl: z.string().url().optional(),
});

const organizationDomainChallengeSchema = z.object({
  domain: z.string().min(3).max(255).regex(/^[a-z0-9.-]+$/),
});

const organizationAgentCreateSchema = z.object({
  displayName: z.string().min(2).max(120),
  handle: z.string().min(2).max(64).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
  capabilities: z.array(z.string().min(1)).max(30).optional(),
});

type AuthContext = {
  tenantId: string;
  userId: string;
  role: z.infer<typeof roleSchema>;
};

type ApiKeyAuthContext = {
  tenantId: string;
  apiKeyId: string;
  keyPrefix: string;
  scopes: string[];
  userId: string | null;
  organizationId: string | null;
  agentId: string | null;
};

type Permission =
  | "api_keys:write"
  | "subjects:write"
  | "subjects:read"
  | "verifications:write"
  | "verifications:read"
  | "policies:write"
  | "trust:evaluate"
  | "trust:read"
  | "trust:simulate"
  | "reviews:write"
  | "reviews:read"
  | "trust_cards:write"
  | "trust_cards:read_public"
  | "actions:sign"
  | "actions:verify"
  | "actions:read"
  | "audit:read"
  | "webhooks:write"
  | "webhooks:read";

const allRoles: AuthContext["role"][] = [
  "OWNER",
  "ADMIN",
  "TRUST_REVIEWER",
  "DEVELOPER",
  "ANALYST",
];

const rolePermissions: Record<AuthContext["role"], Set<Permission>> = {
  OWNER: new Set<Permission>([
    "api_keys:write",
    "subjects:write",
    "subjects:read",
    "verifications:write",
    "verifications:read",
    "policies:write",
    "trust:evaluate",
    "trust:read",
    "trust:simulate",
    "reviews:write",
    "reviews:read",
    "trust_cards:write",
    "trust_cards:read_public",
    "actions:sign",
    "actions:verify",
    "actions:read",
    "audit:read",
    "webhooks:write",
    "webhooks:read",
  ]),
  ADMIN: new Set<Permission>([
    "api_keys:write",
    "subjects:write",
    "subjects:read",
    "verifications:write",
    "verifications:read",
    "policies:write",
    "trust:evaluate",
    "trust:read",
    "trust:simulate",
    "reviews:write",
    "reviews:read",
    "trust_cards:write",
    "trust_cards:read_public",
    "actions:sign",
    "actions:verify",
    "actions:read",
    "audit:read",
    "webhooks:write",
    "webhooks:read",
  ]),
  TRUST_REVIEWER: new Set<Permission>([
    "subjects:write",
    "subjects:read",
    "verifications:write",
    "verifications:read",
    "trust:evaluate",
    "trust:read",
    "trust:simulate",
    "reviews:write",
    "reviews:read",
    "trust_cards:write",
    "trust_cards:read_public",
    "actions:sign",
    "actions:verify",
    "actions:read",
    "audit:read",
  ]),
  DEVELOPER: new Set<Permission>([
    "subjects:write",
    "subjects:read",
    "trust_cards:write",
    "trust_cards:read_public",
    "actions:verify",
    "actions:read",
    "webhooks:write",
    "webhooks:read",
  ]),
  ANALYST: new Set<Permission>([
    "subjects:read",
    "verifications:read",
    "trust:read",
    "trust:simulate",
    "reviews:read",
    "actions:read",
    "audit:read",
    "webhooks:read",
    "trust_cards:read_public",
  ]),
};

const jwtSecret = new TextEncoder().encode(
  apiEnv.JWT_SECRET,
);
const actionSigningSecret =
  apiEnv.ACTION_SIGNING_SECRET;

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function signActionDigest(payloadHash: string, nonce: string): string {
  return createHmac("sha256", actionSigningSecret).update(`${payloadHash}:${nonce}`).digest("hex");
}

function sanitizeLogMetadata(value: unknown): unknown {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeLogMetadata(entry));
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (/(token|secret|password|key|hash|signature|credential)/i.test(key)) {
        out[key] = "[REDACTED]";
      } else {
        out[key] = sanitizeLogMetadata(entry);
      }
    }
    return out;
  }
  return String(value);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

async function writeAuditLogRecord(params: {
  request: FastifyRequest;
  tenantId: string;
  actorUserId?: string | null;
  actorAgentId?: string | null;
  actorApiKeyId?: string | null;
  actionType: string;
  targetType: string;
  targetId?: string | null;
  orgId?: string | null;
  outcome?: "SUCCESS" | "FAILURE";
  metadata?: Record<string, unknown>;
}) {
  const ipAddress =
    (typeof params.request.headers["x-forwarded-for"] === "string"
      ? params.request.headers["x-forwarded-for"].split(",")[0]?.trim()
      : undefined) ?? undefined;

  await prisma.auditLog.create({
    data: {
      tenantId: params.tenantId,
      actorUserId: params.actorUserId ?? null,
      actorAgentId: params.actorAgentId ?? null,
      actorApiKeyId: params.actorApiKeyId ?? null,
      actionType: params.actionType,
      resourceType: params.targetType,
      resourceId: params.targetId ?? null,
      requestId: (params.request as any).requestId ?? undefined,
      ipAddress,
      userAgent: params.request.headers["user-agent"],
      outcome: params.outcome ?? "SUCCESS",
      metadataJson: sanitizeLogMetadata({
        organizationId: params.orgId ?? null,
        ...(params.metadata ?? {}),
      }) as any,
    },
  });
}

async function recordSignedActionPlaceholder(params: {
  tenantId: string;
  subjectId: string;
  actionType: string;
  targetType: string;
  targetId: string;
  payload: Record<string, unknown>;
}) {
  const canonicalPayload = sanitizeLogMetadata(params.payload);
  const payloadHash = sha256(JSON.stringify(canonicalPayload));
  const nonce = randomBytes(16).toString("hex");
  const signature = sha256(`placeholder:${payloadHash}:${nonce}`);
  await prisma.signedAction.create({
    data: {
      tenantId: params.tenantId,
      subjectId: params.subjectId,
      contextType: "api_request",
      actionType: params.actionType,
      resourceType: params.targetType,
      resourceId: params.targetId,
      payloadHash,
      nonce,
      signature,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      verificationStatus: "PENDING",
    },
  });
}

async function appendAuditEvent(params: {
  tenantId: string;
  actorType: string;
  actorRef: string;
  eventType: string;
  entityType: string;
  entityId: string;
  dataJson: unknown;
}) {
  const previous = await prisma.auditEvent.findFirst({
    where: { tenantId: params.tenantId },
    orderBy: { createdAt: "desc" },
  });

  const hashPrev = previous?.hashSelf ?? null;
  const hashSelf = sha256(
    JSON.stringify({
      tenantId: params.tenantId,
      actorType: params.actorType,
      actorRef: params.actorRef,
      eventType: params.eventType,
      entityType: params.entityType,
      entityId: params.entityId,
      dataJson: params.dataJson,
      hashPrev,
    }),
  );

  return await prisma.auditEvent.create({
    data: {
      tenantId: params.tenantId,
      actorType: params.actorType,
      actorRef: params.actorRef,
      eventType: params.eventType,
      entityType: params.entityType,
      entityId: params.entityId,
      dataJson: params.dataJson as any,
      hashPrev,
      hashSelf,
    },
  });
}

async function enqueueWebhookDeliveries(params: {
  tenantId: string;
  eventType: string;
  payload: Record<string, unknown>;
}) {
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: {
      tenantId: params.tenantId,
      status: "ACTIVE",
      subscribedEvents: {
        has: params.eventType,
      },
    },
  });

  for (const endpoint of endpoints) {
    const delivery = await prisma.webhookDelivery.create({
      data: {
        tenantId: params.tenantId,
        webhookEndpointId: endpoint.id,
        eventType: params.eventType,
        eventPayload: params.payload as any,
        status: "QUEUED",
      },
    });

    await webhookQueue.add(
      "deliver-webhook",
      { deliveryId: delivery.id },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: true,
      },
    );
  }
}

async function getIdempotencyCachedResponse(params: {
  tenantId: string;
  routeKey: string;
  key?: string;
}) {
  if (!params.key) {
    return null;
  }

  const cached = await prisma.idempotencyKey.findUnique({
    where: {
      tenantId_routeKey_key: {
        tenantId: params.tenantId,
        routeKey: params.routeKey,
        key: params.key,
      },
    },
  });

  if (!cached) {
    return null;
  }

  if (cached.expiresAt.getTime() < Date.now()) {
    return null;
  }

  return {
    statusCode: cached.statusCode,
    payload: cached.responseJson,
  };
}

async function saveIdempotencyResponse(params: {
  tenantId: string;
  routeKey: string;
  key?: string;
  statusCode: number;
  payload: unknown;
}) {
  if (!params.key) {
    return;
  }

  await prisma.idempotencyKey.upsert({
    where: {
      tenantId_routeKey_key: {
        tenantId: params.tenantId,
        routeKey: params.routeKey,
        key: params.key,
      },
    },
    update: {
      statusCode: params.statusCode,
      responseJson: params.payload as any,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    },
    create: {
      tenantId: params.tenantId,
      routeKey: params.routeKey,
      key: params.key,
      statusCode: params.statusCode,
      responseJson: params.payload as any,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    },
  });
}

function getBearerToken(request: FastifyRequest): string | null {
  const authorization = request.headers.authorization;
  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
}

async function signAccessToken(payload: AuthContext): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(jwtSecret);
}

async function parseAuthToken(request: FastifyRequest): Promise<AuthContext | null> {
  const token = getBearerToken(request);
  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, jwtSecret);
    const parsedRole = roleSchema.safeParse(payload.role);

    if (
      !parsedRole.success ||
      typeof payload.tenantId !== "string" ||
      typeof payload.userId !== "string"
    ) {
      return null;
    }

    return {
      tenantId: payload.tenantId,
      userId: payload.userId,
      role: parsedRole.data,
    };
  } catch {
    return null;
  }
}

async function requireRole(
  request: FastifyRequest,
  reply: FastifyReply,
  acceptedRoles: AuthContext["role"][],
): Promise<AuthContext | null> {
  const auth = await parseAuthToken(request);
  if (!auth) {
    reply.code(401).send({ code: "UNAUTHORIZED", message: "Missing or invalid token." });
    return null;
  }

  const membership = await prisma.membership.findUnique({
    where: {
      tenantId_userId: {
        tenantId: auth.tenantId,
        userId: auth.userId,
      },
    },
  });

  if (!membership) {
    reply.code(403).send({ code: "FORBIDDEN", message: "Membership check failed." });
    return null;
  }

  if (!acceptedRoles.includes(membership.role)) {
    reply.code(403).send({ code: "FORBIDDEN", message: "Insufficient role." });
    return null;
  }

  return {
    tenantId: membership.tenantId,
    userId: membership.userId,
    role: membership.role,
  };
}

async function requirePermission(
  request: FastifyRequest,
  reply: FastifyReply,
  permission: Permission,
): Promise<AuthContext | null> {
  const auth = await requireRole(request, reply, allRoles);
  if (!auth) {
    return null;
  }

  const allowed = rolePermissions[auth.role]?.has(permission) ?? false;
  if (!allowed) {
    reply.code(403).send({ code: "FORBIDDEN", message: `Missing permission: ${permission}` });
    return null;
  }

  return auth;
}

function sendSuccess<TData extends Record<string, unknown> | unknown[] | string | number | boolean | null>(
  reply: FastifyReply,
  data: TData,
  meta: Record<string, unknown> = {},
  statusCode = 200,
) {
  return reply.code(statusCode).send({
    success: true,
    data,
    error: null,
    meta,
  });
}

function sendError(
  reply: FastifyReply,
  statusCode: number,
  code: string,
  message: string,
  meta: Record<string, unknown> = {},
) {
  return reply.code(statusCode).send({
    success: false,
    data: null,
    error: { code, message },
    meta,
  });
}

function extractApiKey(request: FastifyRequest): string | null {
  const headerKey = request.headers["x-api-key"];
  if (typeof headerKey === "string" && headerKey.trim().length > 0) {
    return headerKey.trim();
  }

  const authorization = request.headers.authorization;
  if (!authorization) {
    return null;
  }
  const [scheme, token] = authorization.split(" ");
  if (!scheme || !token) {
    return null;
  }
  if (scheme.toLowerCase() !== "apikey") {
    return null;
  }
  return token.trim();
}

const apiKeyRateLimitStore = new Map<string, { windowStart: number; count: number }>();
const apiKeyRateLimitMax = 120;
const apiKeyRateLimitWindowMs = 60_000;

function checkApiKeyRateLimit(apiKeyId: string) {
  const now = Date.now();
  const current = apiKeyRateLimitStore.get(apiKeyId);
  if (!current || now - current.windowStart >= apiKeyRateLimitWindowMs) {
    apiKeyRateLimitStore.set(apiKeyId, { windowStart: now, count: 1 });
    return {
      allowed: true,
      limit: apiKeyRateLimitMax,
      remaining: apiKeyRateLimitMax - 1,
      resetAt: new Date(now + apiKeyRateLimitWindowMs),
    };
  }

  current.count += 1;
  apiKeyRateLimitStore.set(apiKeyId, current);
  return {
    allowed: current.count <= apiKeyRateLimitMax,
    limit: apiKeyRateLimitMax,
    remaining: Math.max(0, apiKeyRateLimitMax - current.count),
    resetAt: new Date(current.windowStart + apiKeyRateLimitWindowMs),
  };
}

async function requireApiKeyAuth(
  request: FastifyRequest,
  reply: FastifyReply,
  requiredScopes: string[],
): Promise<{ auth: ApiKeyAuthContext; rateLimit: ReturnType<typeof checkApiKeyRateLimit> } | null> {
  const rawKey = extractApiKey(request);
  if (!rawKey) {
    sendError(reply, 401, "UNAUTHORIZED", "Missing API key.");
    return null;
  }
  const keyHash = sha256(rawKey);
  const keyRecord = await prisma.apiKey.findFirst({
    where: {
      keyHash,
      deletedAt: null,
    },
  });
  if (!keyRecord || keyRecord.status !== "ACTIVE") {
    sendError(reply, 401, "UNAUTHORIZED", "Invalid API key.");
    return null;
  }
  if (keyRecord.revokedAt || (keyRecord.expiresAt && keyRecord.expiresAt.getTime() <= Date.now())) {
    sendError(reply, 401, "UNAUTHORIZED", "API key revoked or expired.");
    return null;
  }
  const hasScopes = requiredScopes.every((scope) => keyRecord.scopes.includes(scope));
  if (!hasScopes) {
    sendError(reply, 403, "FORBIDDEN", "API key missing required scopes.", {
      requiredScopes,
    });
    return null;
  }
  const rateLimit = checkApiKeyRateLimit(keyRecord.id);
  if (!rateLimit.allowed) {
    sendError(reply, 429, "RATE_LIMITED", "Rate limit exceeded for API key.", {
      limit: rateLimit.limit,
      remaining: rateLimit.remaining,
      resetAt: rateLimit.resetAt.toISOString(),
    });
    return null;
  }

  await prisma.apiKey.update({
    where: { id: keyRecord.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    auth: {
      tenantId: keyRecord.tenantId,
      apiKeyId: keyRecord.id,
      keyPrefix: keyRecord.keyPrefix,
      scopes: keyRecord.scopes,
      userId: keyRecord.userId,
      organizationId: keyRecord.organizationId,
      agentId: keyRecord.agentId,
    },
    rateLimit,
  };
}

async function logDeveloperApiRequest(params: {
  request: FastifyRequest;
  auth: ApiKeyAuthContext;
  method: string;
  path: string;
  statusCode: number;
  outcome: "SUCCESS" | "CLIENT_ERROR" | "SERVER_ERROR" | "RATE_LIMITED" | "UNAUTHORIZED";
  startedAt: number;
  requestPayload?: unknown;
  responsePayload?: unknown;
}) {
  const requestId = (params.request as any).requestId;
  const requestBodyHash =
    params.requestPayload === undefined ? null : sha256(JSON.stringify(sanitizeLogMetadata(params.requestPayload)));
  const responseBodyHash =
    params.responsePayload === undefined ? null : sha256(JSON.stringify(sanitizeLogMetadata(params.responsePayload)));

  await prisma.apiRequestLog.create({
    data: {
      tenantId: params.auth.tenantId,
      apiKeyId: params.auth.apiKeyId,
      userId: params.auth.userId,
      organizationId: params.auth.organizationId,
      agentId: params.auth.agentId,
      method: params.method,
      path: params.path,
      statusCode: params.statusCode,
      outcome: params.outcome,
      latencyMs: Math.max(1, Date.now() - params.startedAt),
      requestId: requestId ?? randomBytes(8).toString("hex"),
      requestBodyHash,
      responseBodyHash,
      ipAddress:
        typeof params.request.headers["x-forwarded-for"] === "string"
          ? params.request.headers["x-forwarded-for"].split(",")[0]?.trim()
          : undefined,
    },
  });
}

app.get("/health", async () => {
  return { status: "ok", service: "api" };
});

app.get("/v1/health", async (_request, reply) => {
  const checks: {
    database: "ok" | "error";
    queue: "ok" | "error";
  } = {
    database: "ok",
    queue: "ok",
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    checks.database = "error";
  }

  try {
    const connection = getQueueConnection();
    const maybeRedis = connection as {
      ping?: () => Promise<string>;
    };
    if (typeof maybeRedis.ping === "function") {
      await maybeRedis.ping();
    }
  } catch {
    checks.queue = "error";
  }

  const healthy = checks.database === "ok" && checks.queue === "ok";
  return reply.code(healthy ? 200 : 503).send({
    status: healthy ? "ok" : "degraded",
    service: "api",
    checks,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.get("/v1/openapi.json", async (_request, reply) => {
  const spec = {
    openapi: "3.1.0",
    info: {
      title: "Internet Passport Developer API",
      version: "1.0.0",
      description: "Developer API for API-key trust checks and signed action validation.",
    },
    servers: [{ url: "http://localhost:4000" }],
    components: {
      securitySchemes: {
        apiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "x-api-key",
        },
      },
      schemas: {
        EnvelopeSuccess: {
          type: "object",
          properties: {
            success: { type: "boolean", const: true },
            data: { type: "object", additionalProperties: true },
            error: { type: "null" },
            meta: { type: "object", additionalProperties: true },
          },
        },
        EnvelopeError: {
          type: "object",
          properties: {
            success: { type: "boolean", const: false },
            data: { type: "null" },
            error: {
              type: "object",
              properties: { code: { type: "string" }, message: { type: "string" } },
              required: ["code", "message"],
            },
            meta: { type: "object", additionalProperties: true },
          },
        },
      },
    },
    security: [{ apiKeyAuth: [] }],
    paths: {
      "/v1/developer/trust-check": {
        post: {
          summary: "Trust check for user/org/agent",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    targetType: { type: "string", enum: ["user", "organization", "agent"] },
                    targetId: { type: "string" },
                    contextType: { type: "string" },
                    actionType: { type: "string" },
                  },
                  required: ["targetType", "targetId"],
                },
              },
            },
          },
          responses: {
            "200": { description: "Trust check result" },
          },
        },
      },
      "/v1/developer/trust/users/{userId}/summary": {
        get: {
          summary: "User trust summary",
          parameters: [{ in: "path", name: "userId", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "User trust summary" } },
        },
      },
      "/v1/developer/trust/organizations/{organizationId}/summary": {
        get: {
          summary: "Organization trust summary",
          parameters: [{ in: "path", name: "organizationId", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Organization trust summary" } },
        },
      },
      "/v1/developer/trust/agents/{agentId}/summary": {
        get: {
          summary: "Agent trust summary",
          parameters: [{ in: "path", name: "agentId", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Agent trust summary" } },
        },
      },
      "/v1/developer/signed-actions/validate": {
        post: {
          summary: "Validate signed action payload hash",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    actionId: { type: "string" },
                    payload: { type: "object", additionalProperties: true },
                  },
                  required: ["actionId", "payload"],
                },
              },
            },
          },
          responses: { "200": { description: "Validation result" } },
        },
      },
      "/v1/health": {
        get: {
          summary: "Deep service health",
          security: [],
          responses: {
            "200": { description: "Healthy" },
            "503": { description: "Degraded" },
          },
        },
      },
      "/v1/organizations": {
        post: {
          summary: "Create organization",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    legalName: { type: "string" },
                    websiteUrl: { type: "string" },
                  },
                  required: ["name"],
                },
              },
            },
          },
          responses: { "201": { description: "Organization created" } },
        },
      },
      "/v1/organizations/{orgId}/domains/challenges": {
        post: {
          summary: "Create domain challenge",
          parameters: [{ in: "path", name: "orgId", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { domain: { type: "string" } },
                  required: ["domain"],
                },
              },
            },
          },
          responses: { "201": { description: "Challenge created" } },
        },
      },
      "/v1/organizations/{orgId}/domains/{domainId}/verify": {
        post: {
          summary: "Verify domain challenge",
          parameters: [
            { in: "path", name: "orgId", required: true, schema: { type: "string" } },
            { in: "path", name: "domainId", required: true, schema: { type: "string" } },
          ],
          responses: { "200": { description: "Domain verified" } },
        },
      },
      "/v1/organizations/{orgId}/agents": {
        post: {
          summary: "Create organization agent",
          parameters: [{ in: "path", name: "orgId", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    displayName: { type: "string" },
                    handle: { type: "string" },
                    description: { type: "string" },
                    capabilities: { type: "array", items: { type: "string" } },
                  },
                  required: ["displayName", "handle"],
                },
              },
            },
          },
          responses: { "201": { description: "Agent created" } },
        },
      },
    },
  };
  return reply.code(200).send(spec);
});

app.get("/v1/docs/developer", async (_request, reply) => {
  return sendSuccess(reply, {
    openapiUrl: "/v1/openapi.json",
    snippets: {
      trustCheck:
        'curl -X POST "http://localhost:4000/v1/developer/trust-check" -H "x-api-key: $API_KEY" -H "content-type: application/json" -d \'{"targetType":"user","targetId":"user_123"}\'',
      userSummary:
        'curl "http://localhost:4000/v1/developer/trust/users/user_123/summary" -H "x-api-key: $API_KEY"',
      signedActionValidate:
        'curl -X POST "http://localhost:4000/v1/developer/signed-actions/validate" -H "x-api-key: $API_KEY" -H "content-type: application/json" -d \'{"actionId":"act_123","payload":{"orderId":"ord_1"}}\'',
    },
  });
});

app.post("/v1/bootstrap/tenant-user", async (request, reply) => {
  const bootstrapKey = process.env.BOOTSTRAP_KEY;
  if (bootstrapKey) {
    const incomingKey = request.headers["x-bootstrap-key"];
    if (incomingKey !== bootstrapKey) {
      return reply.code(401).send({ code: "UNAUTHORIZED", message: "Invalid bootstrap key." });
    }
  }

  const parsed = bootstrapSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.code(400).send({ code: "BAD_REQUEST", message: parsed.error.message });
  }

  const { tenantName, tenantSlug, userName, email, password } = parsed.data;
  const passwordHash = await hash(password, 10);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: tenantName,
          slug: tenantSlug,
        },
      });

      const user = await tx.user.create({
        data: {
          email,
          name: userName,
          passwordHash,
        },
      });

      const membership = await tx.membership.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          role: "OWNER",
        },
      });

      await tx.subject.create({
        data: {
          tenantId: tenant.id,
          subjectType: "HUMAN",
          displayName: userName,
          status: "ACTIVE",
        },
      });

      return { tenant, user, membership };
    });

    const token = await signAccessToken({
      tenantId: result.membership.tenantId,
      userId: result.user.id,
      role: result.membership.role,
    });

    return {
      tenantId: result.tenant.id,
      tenantSlug: result.tenant.slug,
      userId: result.user.id,
      accessToken: token,
    };
  } catch (error) {
    request.log.error(error);
    return reply.code(409).send({
      code: "CONFLICT",
      message: "Unable to bootstrap tenant/user. Slug or email may already exist.",
    });
  }
});

app.post("/v1/auth/login", async (request, reply) => {
  const parsed = loginSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.code(400).send({ code: "BAD_REQUEST", message: parsed.error.message });
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    include: {
      memberships: {
        include: {
          tenant: true,
        },
      },
    },
  });

  if (!user?.passwordHash) {
    return reply.code(401).send({ code: "UNAUTHORIZED", message: "Invalid credentials." });
  }

  const passwordMatches = await compare(parsed.data.password, user.passwordHash);
  if (!passwordMatches) {
    return reply.code(401).send({ code: "UNAUTHORIZED", message: "Invalid credentials." });
  }

  const membership = parsed.data.tenantSlug
    ? user.memberships.find((item) => item.tenant.slug === parsed.data.tenantSlug)
    : user.memberships[0];

  if (!membership) {
    return reply.code(403).send({ code: "FORBIDDEN", message: "No tenant membership found." });
  }

  const token = await signAccessToken({
    tenantId: membership.tenantId,
    userId: user.id,
    role: membership.role,
  });

  await writeAuditLogRecord({
    request,
    tenantId: membership.tenantId,
    actorUserId: user.id,
    actionType: "LOGIN",
    targetType: "Session",
    targetId: user.id,
    outcome: "SUCCESS",
    metadata: { role: membership.role, tenantSlug: membership.tenant.slug },
  });

  return {
    accessToken: token,
    tenantId: membership.tenantId,
    tenantSlug: membership.tenant.slug,
    role: membership.role,
    userId: user.id,
  };
});

app.post("/v1/api-keys", async (request, reply) => {
  const auth = await requirePermission(request, reply, "api_keys:write");
  if (!auth) {
    return;
  }

  const parsed = apiKeySchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.code(400).send({ code: "BAD_REQUEST", message: parsed.error.message });
  }

  const rawKey = `ip_live_${randomBytes(24).toString("hex")}`;
  const keyHash = sha256(rawKey);
  const keyPrefix = rawKey.slice(0, 14);

  const apiKey = await prisma.apiKey.create({
    data: {
      tenantId: auth.tenantId,
      userId: auth.userId,
      name: parsed.data.name,
      scopes: parsed.data.scopes,
      keyHash,
      keyPrefix,
    },
  });

  await writeAuditLogRecord({
    request,
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    actorApiKeyId: apiKey.id,
    actionType: "API_KEY_CREATED",
    targetType: "ApiKey",
    targetId: apiKey.id,
    metadata: { name: apiKey.name, keyPrefix: apiKey.keyPrefix, scopes: apiKey.scopes },
  });

  return {
    id: apiKey.id,
    key: rawKey,
    keyPrefix: apiKey.keyPrefix,
    scopes: apiKey.scopes,
  };
});

app.post("/v1/developer/api-keys", async (request, reply) => {
  const auth = await requirePermission(request, reply, "api_keys:write");
  if (!auth) {
    return;
  }
  const parsed = developerApiKeyCreateSchema.safeParse(request.body);
  if (!parsed.success) {
    return sendError(reply, 400, "BAD_REQUEST", parsed.error.message);
  }

  if (parsed.data.organizationId) {
    const org = await prisma.organization.findFirst({
      where: { id: parsed.data.organizationId, tenantId: auth.tenantId },
    });
    if (!org) {
      return sendError(reply, 404, "NOT_FOUND", "Organization not found.");
    }
  }
  if (parsed.data.agentId) {
    const agent = await prisma.agent.findFirst({
      where: { id: parsed.data.agentId, tenantId: auth.tenantId },
    });
    if (!agent) {
      return sendError(reply, 404, "NOT_FOUND", "Agent not found.");
    }
  }

  const rawKey = `ip_live_${randomBytes(24).toString("hex")}`;
  const keyPrefix = rawKey.slice(0, 14);
  const keyHash = sha256(rawKey);
  const expiresAt = parsed.data.expiresInDays
    ? new Date(Date.now() + parsed.data.expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  const created = await prisma.apiKey.create({
    data: {
      tenantId: auth.tenantId,
      userId: auth.userId,
      organizationId: parsed.data.organizationId ?? null,
      agentId: parsed.data.agentId ?? null,
      name: parsed.data.name,
      keyPrefix,
      keyHash,
      scopes: parsed.data.scopes,
      status: "ACTIVE",
      expiresAt,
    },
  });

  await writeAuditLogRecord({
    request,
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    actorApiKeyId: created.id,
    actionType: "API_KEY_CREATED",
    targetType: "ApiKey",
    targetId: created.id,
    orgId: created.organizationId,
    metadata: { name: created.name, keyPrefix: created.keyPrefix, scopes: created.scopes },
  });

  return sendSuccess(
    reply,
    {
      id: created.id,
      name: created.name,
      keyPrefix: created.keyPrefix,
      secret: rawKey,
      scopes: created.scopes,
      status: created.status,
      expiresAt: created.expiresAt,
      createdAt: created.createdAt,
    },
    {
      note: "Store this secret now. It will not be shown again.",
    },
  );
});

app.get("/v1/developer/api-keys", async (request, reply) => {
  const auth = await requirePermission(request, reply, "api_keys:write");
  if (!auth) {
    return;
  }
  const keys = await prisma.apiKey.findMany({
    where: { tenantId: auth.tenantId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      scopes: true,
      status: true,
      lastUsedAt: true,
      expiresAt: true,
      revokedAt: true,
      createdAt: true,
      organizationId: true,
      agentId: true,
      userId: true,
    },
  });

  return sendSuccess(reply, { items: keys, total: keys.length });
});

app.post("/v1/developer/api-keys/:id/revoke", async (request, reply) => {
  const auth = await requirePermission(request, reply, "api_keys:write");
  if (!auth) {
    return;
  }
  const params = z.object({ id: z.string().min(1) }).safeParse(request.params);
  if (!params.success) {
    return sendError(reply, 400, "BAD_REQUEST", params.error.message);
  }

  const key = await prisma.apiKey.findFirst({
    where: { id: params.data.id, tenantId: auth.tenantId, deletedAt: null },
  });
  if (!key) {
    return sendError(reply, 404, "NOT_FOUND", "API key not found.");
  }

  const revoked = await prisma.apiKey.update({
    where: { id: key.id },
    data: {
      status: "REVOKED",
      revokedAt: new Date(),
    },
  });

  await writeAuditLogRecord({
    request,
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    actorApiKeyId: revoked.id,
    actionType: "API_KEY_REVOKED",
    targetType: "ApiKey",
    targetId: revoked.id,
    orgId: revoked.organizationId,
    metadata: { keyPrefix: revoked.keyPrefix },
  });

  return sendSuccess(reply, {
    id: revoked.id,
    status: revoked.status,
    revokedAt: revoked.revokedAt,
  });
});

app.post("/v1/subjects", async (request, reply) => {
  const auth = await requirePermission(request, reply, "subjects:write");
  if (!auth) {
    return;
  }

  const parsed = subjectCreateSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.code(400).send({ code: "BAD_REQUEST", message: parsed.error.message });
  }

  if (parsed.data.workspaceId) {
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: parsed.data.workspaceId,
        tenantId: auth.tenantId,
      },
    });

    if (!workspace) {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Workspace not found." });
    }
  }

  const subject = await prisma.subject.create({
    data: {
      tenantId: auth.tenantId,
      workspaceId: parsed.data.workspaceId,
      subjectType: parsed.data.subjectType,
      displayName: parsed.data.displayName,
      status: "ACTIVE",
    },
  });

  return subject;
});

app.get("/v1/subjects", async (request, reply) => {
  const auth = await requirePermission(request, reply, "subjects:read");
  if (!auth) {
    return;
  }

  const query = z
    .object({
      limit: z.coerce.number().min(1).max(100).default(50),
      offset: z.coerce.number().min(0).default(0),
      subjectType: z.enum(["HUMAN", "DEVELOPER", "ORG", "AGENT"]).optional(),
    })
    .safeParse(request.query);

  if (!query.success) {
    return reply.code(400).send({ code: "BAD_REQUEST", message: query.error.message });
  }

  const where = {
    tenantId: auth.tenantId,
    ...(query.data.subjectType ? { subjectType: query.data.subjectType } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.subject.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: query.data.limit,
      skip: query.data.offset,
    }),
    prisma.subject.count({ where }),
  ]);

  return {
    items,
    total,
    limit: query.data.limit,
    offset: query.data.offset,
  };
});

app.get("/v1/subjects/:subjectId", async (request, reply) => {
  const auth = await requirePermission(request, reply, "subjects:read");
  if (!auth) {
    return;
  }

  const params = z.object({ subjectId: z.string().min(1) }).safeParse(request.params);
  if (!params.success) {
    return reply.code(400).send({ code: "BAD_REQUEST", message: params.error.message });
  }

  const subject = await prisma.subject.findFirst({
    where: {
      id: params.data.subjectId,
      tenantId: auth.tenantId,
    },
    include: {
      verificationRequests: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      verificationClaims: {
        orderBy: { issuedAt: "desc" },
        take: 20,
      },
    },
  });

  if (!subject) {
    return reply.code(404).send({ code: "NOT_FOUND", message: "Subject not found." });
  }

  return subject;
});

app.post("/v1/organizations", async (request, reply) => {
  const auth = await requirePermission(request, reply, "subjects:write");
  if (!auth) {
    return;
  }
  const parsed = organizationCreateSchema.safeParse(request.body);
  if (!parsed.success) {
    return sendError(reply, 400, "BAD_REQUEST", parsed.error.message);
  }

  const slugBase = slugify(parsed.data.name) || "organization";
  const slug = `${slugBase}-${randomBytes(2).toString("hex")}`;

  const organization = await prisma.organization.create({
    data: {
      tenantId: auth.tenantId,
      ownerUserId: auth.userId,
      name: parsed.data.name,
      slug,
      legalName: parsed.data.legalName ?? null,
      websiteUrl: parsed.data.websiteUrl ?? null,
    },
  });

  await prisma.organizationMember.create({
    data: {
      organizationId: organization.id,
      userId: auth.userId,
      role: "OWNER",
      invitedByUserId: auth.userId,
    },
  });

  await writeAuditLogRecord({
    request,
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    actionType: "ORG_CREATED",
    targetType: "Organization",
    targetId: organization.id,
    orgId: organization.id,
    metadata: {
      slug: organization.slug,
      websiteUrl: organization.websiteUrl,
    },
  });

  return sendSuccess(reply, organization, {}, 201);
});

app.post("/v1/organizations/:orgId/domains/challenges", async (request, reply) => {
  const auth = await requirePermission(request, reply, "subjects:write");
  if (!auth) {
    return;
  }
  const params = z.object({ orgId: z.string().min(1) }).safeParse(request.params);
  if (!params.success) {
    return sendError(reply, 400, "BAD_REQUEST", params.error.message);
  }
  const parsed = organizationDomainChallengeSchema.safeParse(request.body);
  if (!parsed.success) {
    return sendError(reply, 400, "BAD_REQUEST", parsed.error.message);
  }

  const organization = await prisma.organization.findFirst({
    where: { id: params.data.orgId, tenantId: auth.tenantId },
  });
  if (!organization) {
    return sendError(reply, 404, "NOT_FOUND", "Organization not found.");
  }

  const challengeToken = `ip-challenge-${randomBytes(8).toString("hex")}`;
  const domain = await prisma.domainVerification.upsert({
    where: {
      organizationId_domain: {
        organizationId: organization.id,
        domain: parsed.data.domain,
      },
    },
    update: {
      status: "PENDING",
      challengeToken,
      verifiedAt: null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    create: {
      organizationId: organization.id,
      domain: parsed.data.domain,
      status: "PENDING",
      challengeToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  await writeAuditLogRecord({
    request,
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    actionType: "ORG_DOMAIN_CHALLENGE_CREATED",
    targetType: "DomainVerification",
    targetId: domain.id,
    orgId: organization.id,
    metadata: {
      domain: domain.domain,
    },
  });

  return sendSuccess(reply, domain, {}, 201);
});

app.post("/v1/organizations/:orgId/domains/:domainId/verify", async (request, reply) => {
  const auth = await requirePermission(request, reply, "subjects:write");
  if (!auth) {
    return;
  }
  const params = z.object({ orgId: z.string().min(1), domainId: z.string().min(1) }).safeParse(request.params);
  if (!params.success) {
    return sendError(reply, 400, "BAD_REQUEST", params.error.message);
  }

  const organization = await prisma.organization.findFirst({
    where: { id: params.data.orgId, tenantId: auth.tenantId },
  });
  if (!organization) {
    return sendError(reply, 404, "NOT_FOUND", "Organization not found.");
  }
  const domain = await prisma.domainVerification.findFirst({
    where: { id: params.data.domainId, organizationId: organization.id },
  });
  if (!domain) {
    return sendError(reply, 404, "NOT_FOUND", "Domain challenge not found.");
  }

  const updated = await prisma.domainVerification.update({
    where: { id: domain.id },
    data: {
      status: "VERIFIED",
      verifiedAt: new Date(),
    },
  });

  await writeAuditLogRecord({
    request,
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    actionType: "ORG_DOMAIN_VERIFIED",
    targetType: "DomainVerification",
    targetId: updated.id,
    orgId: organization.id,
    metadata: { domain: updated.domain },
  });

  return sendSuccess(reply, updated);
});

app.post("/v1/organizations/:orgId/agents", async (request, reply) => {
  const auth = await requirePermission(request, reply, "subjects:write");
  if (!auth) {
    return;
  }
  const params = z.object({ orgId: z.string().min(1) }).safeParse(request.params);
  if (!params.success) {
    return sendError(reply, 400, "BAD_REQUEST", params.error.message);
  }
  const parsed = organizationAgentCreateSchema.safeParse(request.body);
  if (!parsed.success) {
    return sendError(reply, 400, "BAD_REQUEST", parsed.error.message);
  }

  const organization = await prisma.organization.findFirst({
    where: { id: params.data.orgId, tenantId: auth.tenantId },
  });
  if (!organization) {
    return sendError(reply, 404, "NOT_FOUND", "Organization not found.");
  }

  const agent = await prisma.agent.create({
    data: {
      tenantId: auth.tenantId,
      organizationId: organization.id,
      managerUserId: auth.userId,
      displayName: parsed.data.displayName,
      slug: slugify(parsed.data.handle),
      description: parsed.data.description ?? null,
      status: "ACTIVE",
      metadataJson: {
        handle: parsed.data.handle,
        capabilities: parsed.data.capabilities ?? [],
      } as any,
    },
  });

  await writeAuditLogRecord({
    request,
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    actionType: "ORG_AGENT_CREATED",
    targetType: "Agent",
    targetId: agent.id,
    orgId: organization.id,
    metadata: {
      displayName: agent.displayName,
    },
  });

  return sendSuccess(reply, agent, {}, 201);
});

app.post("/v1/verifications", async (request, reply) => {
  const auth = await requirePermission(request, reply, "verifications:write");
  if (!auth) {
    return;
  }
  const idempotencyKey =
    typeof request.headers["x-idempotency-key"] === "string"
      ? request.headers["x-idempotency-key"]
      : undefined;
  const cached = await getIdempotencyCachedResponse({
    tenantId: auth.tenantId,
    routeKey: "POST:/v1/verifications",
    key: idempotencyKey,
  });
  if (cached) {
    return reply.code(cached.statusCode).send(cached.payload);
  }

  const parsed = verificationCreateSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.code(400).send({ code: "BAD_REQUEST", message: parsed.error.message });
  }

  const subject = await prisma.subject.findFirst({
    where: {
      id: parsed.data.subjectId,
      tenantId: auth.tenantId,
    },
  });
  if (!subject) {
    return reply.code(404).send({ code: "NOT_FOUND", message: "Subject not found." });
  }

  const verificationRequest = await prisma.verificationRequest.create({
    data: {
      tenantId: auth.tenantId,
      subjectId: parsed.data.subjectId,
      verificationType: parsed.data.verificationType,
      requestedByUserId: auth.userId,
      status: "PENDING",
      checks: {
        create: {
          provider: parsed.data.provider,
          status: "QUEUED",
        },
      },
    },
    include: {
      checks: true,
    },
  });

  await verificationQueue.add(
    "process-verification",
    {
      verificationRequestId: verificationRequest.id,
      verificationCheckId: verificationRequest.checks[0].id,
      tenantId: auth.tenantId,
      subjectId: parsed.data.subjectId,
      verificationType: parsed.data.verificationType,
    },
    {
      attempts: 3,
      removeOnComplete: true,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
    },
  );

  await writeAuditLogRecord({
    request,
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    actionType: "VERIFICATION_STARTED",
    targetType: "VerificationRequest",
    targetId: verificationRequest.id,
    outcome: "SUCCESS",
    metadata: {
      subjectId: parsed.data.subjectId,
      verificationType: parsed.data.verificationType,
      provider: parsed.data.provider,
    },
  });

  await recordSignedActionPlaceholder({
    tenantId: auth.tenantId,
    subjectId: parsed.data.subjectId,
    actionType: "VERIFICATION_STARTED",
    targetType: "VerificationRequest",
    targetId: verificationRequest.id,
    payload: {
      verificationType: parsed.data.verificationType,
      provider: parsed.data.provider,
    },
  });

  const responseBody = {
    id: verificationRequest.id,
    status: verificationRequest.status,
    checks: verificationRequest.checks,
  };
  await saveIdempotencyResponse({
    tenantId: auth.tenantId,
    routeKey: "POST:/v1/verifications",
    key: idempotencyKey,
    statusCode: 202,
    payload: responseBody,
  });
  return reply.code(202).send(responseBody);
});

app.get("/v1/verifications/:verificationId", async (request, reply) => {
  const auth = await requirePermission(request, reply, "verifications:read");
  if (!auth) {
    return;
  }

  const params = z.object({ verificationId: z.string().min(1) }).safeParse(request.params);
  if (!params.success) {
    return reply.code(400).send({ code: "BAD_REQUEST", message: params.error.message });
  }

  const verification = await prisma.verificationRequest.findFirst({
    where: {
      id: params.data.verificationId,
      tenantId: auth.tenantId,
    },
    include: {
      checks: true,
      claims: true,
      subject: {
        select: {
          id: true,
          displayName: true,
          subjectType: true,
        },
      },
    },
  });

  if (!verification) {
    return reply.code(404).send({ code: "NOT_FOUND", message: "Verification not found." });
  }

  return verification;
});

app.post("/v1/policies", async (request, reply) => {
  const auth = await requirePermission(request, reply, "policies:write");
  if (!auth) {
    return;
  }

  const parsed = policyCreateSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.code(400).send({ code: "BAD_REQUEST", message: parsed.error.message });
  }

  const previous = await prisma.policy.findFirst({
    where: {
      tenantId: auth.tenantId,
      contextType: parsed.data.contextType,
      isActive: true,
    },
    orderBy: { version: "desc" },
  });

  if (parsed.data.isActive && previous) {
    await prisma.policy.update({
      where: { id: previous.id },
      data: { isActive: false },
    });
  }

  const policy = await prisma.policy.create({
    data: {
      tenantId: auth.tenantId,
      name: parsed.data.name,
      contextType: parsed.data.contextType,
      version: (previous?.version ?? 0) + 1,
      isActive: parsed.data.isActive,
      definition: parsed.data.definition,
    },
  });

  return policy;
});

app.post("/v1/trust/evaluate", async (request, reply) => {
  const auth = await requirePermission(request, reply, "trust:evaluate");
  if (!auth) {
    return;
  }
  const idempotencyKey =
    typeof request.headers["x-idempotency-key"] === "string"
      ? request.headers["x-idempotency-key"]
      : undefined;
  const cached = await getIdempotencyCachedResponse({
    tenantId: auth.tenantId,
    routeKey: "POST:/v1/trust/evaluate",
    key: idempotencyKey,
  });
  if (cached) {
    return reply.code(cached.statusCode).send(cached.payload);
  }

  const parsed = trustEvaluateSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.code(400).send({ code: "BAD_REQUEST", message: parsed.error.message });
  }

  const subject = await prisma.subject.findFirst({
    where: {
      id: parsed.data.subjectId,
      tenantId: auth.tenantId,
    },
    include: {
      verificationClaims: {
        where: { revokedAt: null },
        orderBy: { issuedAt: "desc" },
      },
    },
  });
  if (!subject) {
    return reply.code(404).send({ code: "NOT_FOUND", message: "Subject not found." });
  }

  const activePolicy = await prisma.policy.findFirst({
    where: {
      tenantId: auth.tenantId,
      contextType: parsed.data.contextType,
      isActive: true,
    },
    orderBy: { version: "desc" },
  });

  const latestClaim = subject.verificationClaims[0];
  const hasRecentVerification =
    Boolean(latestClaim?.issuedAt) &&
    Date.now() - new Date(latestClaim.issuedAt).getTime() < 1000 * 60 * 60 * 24 * 30;

  const evaluation = evaluateTrust({
    subjectStatus: subject.status,
    verificationClaimsCount: subject.verificationClaims.length,
    hasRecentVerification,
    contextType: parsed.data.contextType,
    actionType: parsed.data.actionType,
    policyDefinition: (activePolicy?.definition as Record<string, number> | undefined) ?? undefined,
  });

  const result = await prisma.$transaction(async (tx) => {
    const snapshot = await tx.trustScoreSnapshot.create({
      data: {
        subjectId: subject.id,
        policyId: activePolicy?.id,
        score: evaluation.score,
        tier: evaluation.tier,
        reasonCodes: evaluation.reasonCodes,
        featuresHash: evaluation.featuresHash,
      },
    });

    const decision = await tx.trustDecision.create({
      data: {
        tenantId: auth.tenantId,
        subjectId: subject.id,
        scoreSnapshotId: snapshot.id,
        contextType: parsed.data.contextType,
        actionType: parsed.data.actionType,
        decision: evaluation.decision,
        reasonCodes: evaluation.reasonCodes,
        policyVersion: activePolicy?.version,
      },
    });

    const existingProfile = await tx.trustProfile.findFirst({
      where: {
        subjectId: subject.id,
      },
    });

    if (existingProfile) {
      await tx.trustProfile.update({
        where: { id: existingProfile.id },
        data: {
          currentScore: evaluation.score,
          currentTier: evaluation.tier,
          lastEvaluatedAt: new Date(),
        },
      });
    } else {
      await tx.trustProfile.create({
        data: {
          subjectId: subject.id,
          currentScore: evaluation.score,
          currentTier: evaluation.tier,
          lastEvaluatedAt: new Date(),
        },
      });
    }

    return { snapshot, decision };
  });

  const responseBody = {
    decisionId: result.decision.id,
    snapshotId: result.snapshot.id,
    score: evaluation.score,
    tier: evaluation.tier,
    decision: evaluation.decision,
    reasonCodes: evaluation.reasonCodes,
    policyVersion: activePolicy?.version ?? null,
  };

  await writeAuditLogRecord({
    request,
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    actionType: "TRUST_CHECK_REQUESTED",
    targetType: "TrustDecision",
    targetId: result.decision.id,
    outcome: "SUCCESS",
    metadata: {
      subjectId: subject.id,
      contextType: parsed.data.contextType,
      actionType: parsed.data.actionType,
      decision: responseBody.decision,
      score: responseBody.score,
      tier: responseBody.tier,
    },
  });

  await recordSignedActionPlaceholder({
    tenantId: auth.tenantId,
    subjectId: subject.id,
    actionType: "TRUST_CHECK_REQUESTED",
    targetType: "TrustDecision",
    targetId: result.decision.id,
    payload: {
      contextType: parsed.data.contextType,
      actionType: parsed.data.actionType,
      decision: responseBody.decision,
      score: responseBody.score,
      tier: responseBody.tier,
    },
  });

  await saveIdempotencyResponse({
    tenantId: auth.tenantId,
    routeKey: "POST:/v1/trust/evaluate",
    key: idempotencyKey,
    statusCode: 200,
    payload: responseBody,
  });
  return responseBody;
});

app.post("/v1/trust/simulate", async (request, reply) => {
  const auth = await requirePermission(request, reply, "trust:simulate");
  if (!auth) {
    return;
  }

  const parsed = trustSimulateSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.code(400).send({ code: "BAD_REQUEST", message: parsed.error.message });
  }

  const subject = await prisma.subject.findFirst({
    where: {
      id: parsed.data.subjectId,
      tenantId: auth.tenantId,
    },
    include: {
      verificationClaims: {
        where: { revokedAt: null },
        orderBy: { issuedAt: "desc" },
      },
    },
  });
  if (!subject) {
    return reply.code(404).send({ code: "NOT_FOUND", message: "Subject not found." });
  }

  const latestClaim = subject.verificationClaims[0];
  const hasRecentVerification =
    Boolean(latestClaim?.issuedAt) &&
    Date.now() - new Date(latestClaim.issuedAt).getTime() < 1000 * 60 * 60 * 24 * 30;

  const evaluation = evaluateTrust({
    subjectStatus: subject.status,
    verificationClaimsCount: subject.verificationClaims.length,
    hasRecentVerification,
    contextType: parsed.data.contextType,
    actionType: parsed.data.actionType,
    policyDefinition: parsed.data.policyDefinition,
  });

  return {
    simulated: true,
    subjectId: subject.id,
    score: evaluation.score,
    tier: evaluation.tier,
    decision: evaluation.decision,
    reasonCodes: evaluation.reasonCodes,
    normalizedPolicy: evaluation.normalizedPolicy,
  };
});

app.get("/v1/trust/decisions", async (request, reply) => {
  const auth = await requirePermission(request, reply, "trust:read");
  if (!auth) {
    return;
  }

  const query = z
    .object({
      limit: z.coerce.number().min(1).max(100).default(20),
      offset: z.coerce.number().min(0).default(0),
    })
    .safeParse(request.query);
  if (!query.success) {
    return reply.code(400).send({ code: "BAD_REQUEST", message: query.error.message });
  }

  const [items, total] = await Promise.all([
    prisma.trustDecision.findMany({
      where: { tenantId: auth.tenantId },
      include: {
        subject: {
          select: {
            id: true,
            displayName: true,
            subjectType: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: query.data.limit,
      skip: query.data.offset,
    }),
    prisma.trustDecision.count({ where: { tenantId: auth.tenantId } }),
  ]);

  return {
    items,
    total,
    limit: query.data.limit,
    offset: query.data.offset,
  };
});

app.get("/v1/trust/summary", async (request, reply) => {
  const auth = await requirePermission(request, reply, "trust:read");
  if (!auth) {
    return;
  }

  const parsed = trustTargetSchema.safeParse(request.query);
  if (!parsed.success) {
    return reply.code(400).send({ code: "BAD_REQUEST", message: parsed.error.message });
  }

  const summary = await getCurrentTrustSummary({
    tenantId: auth.tenantId,
    ...(parsed.data.userId ? { userId: parsed.data.userId } : {}),
    ...(parsed.data.organizationId ? { organizationId: parsed.data.organizationId } : {}),
    ...(parsed.data.agentId ? { agentId: parsed.data.agentId } : {}),
  });

  return {
    score: summary.trustScore?.score ?? null,
    trustTier: summary.trustScore?.tier ?? null,
    riskTier: summary.riskTier,
    calculatedAt: summary.trustScore?.calculatedAt ?? null,
    explanations: summary.explanations,
    activeSignals: summary.activeSignals.map((signal) => ({
      id: signal.id,
      signalType: signal.signalType,
      severity: signal.severity,
      scoreDelta: signal.scoreDelta,
      detectedAt: signal.detectedAt,
    })),
  };
});

app.post("/v1/developer/trust-check", async (request, reply) => {
  const startedAt = Date.now();
  const authResult = await requireApiKeyAuth(request, reply, ["trust:check"]);
  if (!authResult) {
    return;
  }
  const { auth, rateLimit } = authResult;
  const parsed = developerTrustCheckSchema.safeParse(request.body);
  if (!parsed.success) {
    return sendError(reply, 400, "BAD_REQUEST", parsed.error.message, {
      rateLimit: {
        limit: rateLimit.limit,
        remaining: rateLimit.remaining,
        resetAt: rateLimit.resetAt.toISOString(),
      },
    });
  }

  const target =
    parsed.data.targetType === "user"
      ? { userId: parsed.data.targetId }
      : parsed.data.targetType === "organization"
        ? { organizationId: parsed.data.targetId }
        : { agentId: parsed.data.targetId };

  const summary = await getCurrentTrustSummary({
    tenantId: auth.tenantId,
    ...target,
  });

  const payload = {
    targetType: parsed.data.targetType,
    targetId: parsed.data.targetId,
    score: summary.trustScore?.score ?? null,
    trustTier: summary.trustScore?.tier ?? null,
    riskTier: summary.riskTier,
    explanations: summary.explanations,
    activeSignals: summary.activeSignals.map((signal) => ({
      signalType: signal.signalType,
      severity: signal.severity,
      scoreDelta: signal.scoreDelta,
      detectedAt: signal.detectedAt,
    })),
  };

  await logDeveloperApiRequest({
    request,
    auth,
    method: "POST",
    path: "/v1/developer/trust-check",
    statusCode: 200,
    outcome: "SUCCESS",
    startedAt,
    requestPayload: parsed.data,
    responsePayload: payload,
  });

  return sendSuccess(reply, payload, {
    requestId: (request as any).requestId,
    keyPrefix: auth.keyPrefix,
    rateLimit: {
      limit: rateLimit.limit,
      remaining: rateLimit.remaining,
      resetAt: rateLimit.resetAt.toISOString(),
    },
  });
});

app.get("/v1/developer/trust/users/:userId/summary", async (request, reply) => {
  const startedAt = Date.now();
  const authResult = await requireApiKeyAuth(request, reply, ["trust:read"]);
  if (!authResult) {
    return;
  }
  const { auth, rateLimit } = authResult;
  const params = z.object({ userId: z.string().min(1) }).safeParse(request.params);
  if (!params.success) {
    return sendError(reply, 400, "BAD_REQUEST", params.error.message);
  }
  const summary = await getCurrentTrustSummary({
    tenantId: auth.tenantId,
    userId: params.data.userId,
  });
  const payload = {
    userId: params.data.userId,
    score: summary.trustScore?.score ?? null,
    trustTier: summary.trustScore?.tier ?? null,
    riskTier: summary.riskTier,
    explanations: summary.explanations,
  };
  await logDeveloperApiRequest({
    request,
    auth,
    method: "GET",
    path: "/v1/developer/trust/users/:userId/summary",
    statusCode: 200,
    outcome: "SUCCESS",
    startedAt,
    responsePayload: payload,
  });
  return sendSuccess(reply, payload, {
    keyPrefix: auth.keyPrefix,
    rateLimit: {
      limit: rateLimit.limit,
      remaining: rateLimit.remaining,
      resetAt: rateLimit.resetAt.toISOString(),
    },
  });
});

app.get("/v1/developer/trust/organizations/:organizationId/summary", async (request, reply) => {
  const startedAt = Date.now();
  const authResult = await requireApiKeyAuth(request, reply, ["trust:read"]);
  if (!authResult) {
    return;
  }
  const { auth, rateLimit } = authResult;
  const params = z.object({ organizationId: z.string().min(1) }).safeParse(request.params);
  if (!params.success) {
    return sendError(reply, 400, "BAD_REQUEST", params.error.message);
  }
  const summary = await getCurrentTrustSummary({
    tenantId: auth.tenantId,
    organizationId: params.data.organizationId,
  });
  const payload = {
    organizationId: params.data.organizationId,
    score: summary.trustScore?.score ?? null,
    trustTier: summary.trustScore?.tier ?? null,
    riskTier: summary.riskTier,
    explanations: summary.explanations,
  };
  await logDeveloperApiRequest({
    request,
    auth,
    method: "GET",
    path: "/v1/developer/trust/organizations/:organizationId/summary",
    statusCode: 200,
    outcome: "SUCCESS",
    startedAt,
    responsePayload: payload,
  });
  return sendSuccess(reply, payload, {
    keyPrefix: auth.keyPrefix,
    rateLimit: {
      limit: rateLimit.limit,
      remaining: rateLimit.remaining,
      resetAt: rateLimit.resetAt.toISOString(),
    },
  });
});

app.get("/v1/developer/trust/agents/:agentId/summary", async (request, reply) => {
  const startedAt = Date.now();
  const authResult = await requireApiKeyAuth(request, reply, ["trust:read"]);
  if (!authResult) {
    return;
  }
  const { auth, rateLimit } = authResult;
  const params = z.object({ agentId: z.string().min(1) }).safeParse(request.params);
  if (!params.success) {
    return sendError(reply, 400, "BAD_REQUEST", params.error.message);
  }
  const summary = await getCurrentTrustSummary({
    tenantId: auth.tenantId,
    agentId: params.data.agentId,
  });
  const payload = {
    agentId: params.data.agentId,
    score: summary.trustScore?.score ?? null,
    trustTier: summary.trustScore?.tier ?? null,
    riskTier: summary.riskTier,
    explanations: summary.explanations,
  };
  await logDeveloperApiRequest({
    request,
    auth,
    method: "GET",
    path: "/v1/developer/trust/agents/:agentId/summary",
    statusCode: 200,
    outcome: "SUCCESS",
    startedAt,
    responsePayload: payload,
  });
  return sendSuccess(reply, payload, {
    keyPrefix: auth.keyPrefix,
    rateLimit: {
      limit: rateLimit.limit,
      remaining: rateLimit.remaining,
      resetAt: rateLimit.resetAt.toISOString(),
    },
  });
});

app.post("/v1/developer/signed-actions/validate", async (request, reply) => {
  const startedAt = Date.now();
  const authResult = await requireApiKeyAuth(request, reply, ["actions:verify"]);
  if (!authResult) {
    return;
  }
  const { auth, rateLimit } = authResult;
  const parsed = developerSignedActionValidateSchema.safeParse(request.body);
  if (!parsed.success) {
    return sendError(reply, 400, "BAD_REQUEST", parsed.error.message);
  }
  const action = await prisma.signedAction.findFirst({
    where: { id: parsed.data.actionId, tenantId: auth.tenantId },
  });
  if (!action) {
    await logDeveloperApiRequest({
      request,
      auth,
      method: "POST",
      path: "/v1/developer/signed-actions/validate",
      statusCode: 404,
      outcome: "CLIENT_ERROR",
      startedAt,
      requestPayload: parsed.data,
      responsePayload: { code: "NOT_FOUND" },
    });
    return sendError(reply, 404, "NOT_FOUND", "Signed action not found.");
  }
  const payloadHash = sha256(JSON.stringify(parsed.data.payload));
  const now = Date.now();
  const isExpired = action.expiresAt.getTime() <= now;
  const matches = payloadHash === action.payloadHash;
  const isValid = matches && !isExpired;

  const updated = await prisma.signedAction.update({
    where: { id: action.id },
    data: {
      verificationStatus: isValid ? "VERIFIED" : isExpired ? "EXPIRED" : "INVALID",
      verifiedAt: isValid ? new Date() : action.verifiedAt,
    },
  });

  const payload = {
    actionId: action.id,
    valid: isValid,
    verificationStatus: updated.verificationStatus,
    signature: updated.signature,
    resourceType: updated.resourceType,
    resourceId: updated.resourceId,
    expiresAt: updated.expiresAt,
  };

  await logDeveloperApiRequest({
    request,
    auth,
    method: "POST",
    path: "/v1/developer/signed-actions/validate",
    statusCode: 200,
    outcome: "SUCCESS",
    startedAt,
    requestPayload: parsed.data,
    responsePayload: payload,
  });

  return sendSuccess(reply, payload, {
    keyPrefix: auth.keyPrefix,
    rateLimit: {
      limit: rateLimit.limit,
      remaining: rateLimit.remaining,
      resetAt: rateLimit.resetAt.toISOString(),
    },
  });
});

app.post("/v1/trust/recalculate", async (request, reply) => {
  const auth = await requirePermission(request, reply, "trust:evaluate");
  if (!auth) {
    return;
  }

  const parsed = trustRecalculateSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.code(400).send({ code: "BAD_REQUEST", message: parsed.error.message });
  }

  const recalculated = await recalculateAndPersistTrust({
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    trigger: "manual",
    ...(parsed.data.userId ? { userId: parsed.data.userId } : {}),
    ...(parsed.data.organizationId ? { organizationId: parsed.data.organizationId } : {}),
    ...(parsed.data.agentId ? { agentId: parsed.data.agentId } : {}),
    configOverride: parsed.data.engineConfig,
  });

  return {
    score: recalculated.trustScore.score,
    trustTier: recalculated.trustScore.tier,
    riskTier: recalculated.riskTier,
    explanations: recalculated.factors.map((factor) => factor.explanation),
    factors: recalculated.factors,
    featuresHash: recalculated.featuresHash,
    configVersion: recalculated.configVersion,
  };
});

app.post("/v1/reviews/cases", async (request, reply) => {
  const auth = await requirePermission(request, reply, "reviews:write");
  if (!auth) {
    return;
  }

  const parsed = reviewCaseCreateSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.code(400).send({ code: "BAD_REQUEST", message: parsed.error.message });
  }

  const subject = await prisma.subject.findFirst({
    where: { id: parsed.data.subjectId, tenantId: auth.tenantId },
  });
  if (!subject) {
    return reply.code(404).send({ code: "NOT_FOUND", message: "Subject not found." });
  }

  const reviewCase = await prisma.reviewCase.create({
    data: {
      tenantId: auth.tenantId,
      subjectId: parsed.data.subjectId,
      caseType: parsed.data.caseType,
      priority: parsed.data.priority,
      openedByUserId: auth.userId,
      status: "OPEN",
      tasks: {
        create: {
          taskType: "INITIAL_REVIEW",
          status: "OPEN",
        },
      },
    },
    include: {
      tasks: true,
    },
  });

  await appendAuditEvent({
    tenantId: auth.tenantId,
    actorType: "USER",
    actorRef: auth.userId,
    eventType: "REVIEW_CASE_CREATED",
    entityType: "ReviewCase",
    entityId: reviewCase.id,
    dataJson: {
      subjectId: reviewCase.subjectId,
      caseType: reviewCase.caseType,
      priority: reviewCase.priority,
    },
  });

  await enqueueWebhookDeliveries({
    tenantId: auth.tenantId,
    eventType: "review.case.created",
    payload: {
      reviewCaseId: reviewCase.id,
      subjectId: reviewCase.subjectId,
      caseType: reviewCase.caseType,
      status: reviewCase.status,
    },
  });

  return reviewCase;
});

app.get("/v1/reviews/cases", async (request, reply) => {
  const auth = await requirePermission(request, reply, "reviews:read");
  if (!auth) {
    return;
  }

  const query = z
    .object({
      limit: z.coerce.number().min(1).max(100).default(20),
      offset: z.coerce.number().min(0).default(0),
      status: z.enum(["OPEN", "IN_REVIEW", "DECIDED", "CLOSED"]).optional(),
    })
    .safeParse(request.query);
  if (!query.success) {
    return reply.code(400).send({ code: "BAD_REQUEST", message: query.error.message });
  }

  const where = {
    tenantId: auth.tenantId,
    ...(query.data.status ? { status: query.data.status } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.reviewCase.findMany({
      where,
      include: {
        subject: { select: { id: true, displayName: true, subjectType: true } },
        tasks: true,
      },
      orderBy: { createdAt: "desc" },
      take: query.data.limit,
      skip: query.data.offset,
    }),
    prisma.reviewCase.count({ where }),
  ]);

  return { items, total, limit: query.data.limit, offset: query.data.offset };
});

app.post("/v1/reviews/cases/:id/assign", async (request, reply) => {
  const auth = await requirePermission(request, reply, "reviews:write");
  if (!auth) {
    return;
  }

  const params = z.object({ id: z.string().min(1) }).safeParse(request.params);
  if (!params.success) {
    return reply.code(400).send({ code: "BAD_REQUEST", message: params.error.message });
  }
  const parsed = reviewAssignSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.code(400).send({ code: "BAD_REQUEST", message: parsed.error.message });
  }

  const reviewCase = await prisma.reviewCase.findFirst({
    where: { id: params.data.id, tenantId: auth.tenantId },
  });
  if (!reviewCase) {
    return reply.code(404).send({ code: "NOT_FOUND", message: "Review case not found." });
  }

  const assigneeMembership = await prisma.membership.findUnique({
    where: {
      tenantId_userId: {
        tenantId: auth.tenantId,
        userId: parsed.data.assignedToUserId,
      },
    },
  });
  if (!assigneeMembership) {
    return reply.code(404).send({ code: "NOT_FOUND", message: "Assignee not in tenant." });
  }

  const task = await prisma.reviewTask.update({
    where: { id: parsed.data.reviewTaskId },
    data: {
      assignedToUserId: parsed.data.assignedToUserId,
      status: "IN_PROGRESS",
    },
  });

  await prisma.reviewCase.update({
    where: { id: reviewCase.id },
    data: { status: "IN_REVIEW" },
  });

  await appendAuditEvent({
    tenantId: auth.tenantId,
    actorType: "USER",
    actorRef: auth.userId,
    eventType: "REVIEW_TASK_ASSIGNED",
    entityType: "ReviewTask",
    entityId: task.id,
    dataJson: {
      reviewCaseId: reviewCase.id,
      assignedToUserId: parsed.data.assignedToUserId,
    },
  });

  return task;
});

app.post("/v1/reviews/cases/:id/decision", async (request, reply) => {
  const auth = await requirePermission(request, reply, "reviews:write");
  if (!auth) {
    return;
  }
  const idempotencyKey =
    typeof request.headers["x-idempotency-key"] === "string"
      ? request.headers["x-idempotency-key"]
      : undefined;
  const cached = await getIdempotencyCachedResponse({
    tenantId: auth.tenantId,
    routeKey: "POST:/v1/reviews/cases/:id/decision",
    key: idempotencyKey,
  });
  if (cached) {
    return reply.code(cached.statusCode).send(cached.payload);
  }

  const params = z.object({ id: z.string().min(1) }).safeParse(request.params);
  if (!params.success) {
    return reply.code(400).send({ code: "BAD_REQUEST", message: params.error.message });
  }
  const parsed = reviewDecisionSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.code(400).send({ code: "BAD_REQUEST", message: parsed.error.message });
  }

  const reviewCase = await prisma.reviewCase.findFirst({
    where: { id: params.data.id, tenantId: auth.tenantId },
  });
  if (!reviewCase) {
    return reply.code(404).send({ code: "NOT_FOUND", message: "Review case not found." });
  }

  const decision = await prisma.$transaction(async (tx) => {
    const created = await tx.reviewDecision.create({
      data: {
        reviewCaseId: reviewCase.id,
        deciderUserId: auth.userId,
        decision: parsed.data.decision,
        rationale: parsed.data.rationale,
      },
    });

    await tx.reviewTask.updateMany({
      where: { reviewCaseId: reviewCase.id, status: { in: ["OPEN", "IN_PROGRESS"] } },
      data: { status: "COMPLETED" },
    });

    await tx.reviewCase.update({
      where: { id: reviewCase.id },
      data: {
        status: "DECIDED",
        closedAt: new Date(),
      },
    });

    return created;
  });

  await appendAuditEvent({
    tenantId: auth.tenantId,
    actorType: "USER",
    actorRef: auth.userId,
    eventType: "REVIEW_CASE_DECIDED",
    entityType: "ReviewCase",
    entityId: reviewCase.id,
    dataJson: {
      decision: parsed.data.decision,
      rationale: parsed.data.rationale,
    },
  });

  await writeAuditLogRecord({
    request,
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    actionType: "ADMIN_REVIEW_DECIDED",
    targetType: "ReviewCase",
    targetId: reviewCase.id,
    outcome: "SUCCESS",
    metadata: {
      reviewDecision: parsed.data.decision,
      rationale: parsed.data.rationale,
    },
  });

  await recordSignedActionPlaceholder({
    tenantId: auth.tenantId,
    subjectId: reviewCase.subjectId,
    actionType: "ADMIN_REVIEW_DECIDED",
    targetType: "ReviewCase",
    targetId: reviewCase.id,
    payload: {
      reviewDecision: parsed.data.decision,
      rationale: parsed.data.rationale,
      decisionId: decision.id,
    },
  });

  await enqueueWebhookDeliveries({
    tenantId: auth.tenantId,
    eventType: "review.case.decided",
    payload: {
      reviewCaseId: reviewCase.id,
      decisionId: decision.id,
      decision: decision.decision,
    },
  });

  await saveIdempotencyResponse({
    tenantId: auth.tenantId,
    routeKey: "POST:/v1/reviews/cases/:id/decision",
    key: idempotencyKey,
    statusCode: 200,
    payload: decision,
  });
  return decision;
});

app.post("/v1/admin/flags/:id/resolve", async (request, reply) => {
  const auth = await requirePermission(request, reply, "reviews:write");
  if (!auth) {
    return;
  }

  const params = z.object({ id: z.string().min(1) }).safeParse(request.params);
  if (!params.success) {
    return reply.code(400).send({ code: "BAD_REQUEST", message: params.error.message });
  }
  const parsed = adminFlagResolveSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.code(400).send({ code: "BAD_REQUEST", message: parsed.error.message });
  }

  const flag = await prisma.adminFlag.findFirst({
    where: { id: params.data.id, tenantId: auth.tenantId },
  });
  if (!flag) {
    return reply.code(404).send({ code: "NOT_FOUND", message: "Admin flag not found." });
  }

  const updated = await prisma.adminFlag.update({
    where: { id: flag.id },
    data: {
      status: parsed.data.status,
      resolvedByUserId: auth.userId,
      resolvedAt: new Date(),
      metadataJson: {
        ...(typeof flag.metadataJson === "object" && flag.metadataJson !== null ? (flag.metadataJson as Record<string, unknown>) : {}),
        resolutionNote: parsed.data.note ?? null,
      } as any,
    },
  });

  await appendAuditEvent({
    tenantId: auth.tenantId,
    actorType: "USER",
    actorRef: auth.userId,
    eventType: "ADMIN_FLAG_RESOLVED",
    entityType: "AdminFlag",
    entityId: updated.id,
    dataJson: {
      status: updated.status,
      reasonCode: updated.reasonCode,
      note: parsed.data.note ?? null,
    },
  });

  await writeAuditLogRecord({
    request,
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    actionType: "ADMIN_FLAG_RESOLVED",
    targetType: "AdminFlag",
    targetId: updated.id,
    outcome: "SUCCESS",
    metadata: {
      status: updated.status,
      reasonCode: updated.reasonCode,
      note: parsed.data.note ?? null,
      organizationId: updated.organizationId ?? null,
    },
  });

  const hasTarget = Boolean(updated.userId || updated.organizationId || updated.agentId);
  const trust = hasTarget
    ? await recalculateAndPersistTrust({
        tenantId: auth.tenantId,
        actorUserId: auth.userId,
        trigger: "admin_action",
        ...(updated.userId ? { userId: updated.userId } : {}),
        ...(updated.organizationId ? { organizationId: updated.organizationId } : {}),
        ...(updated.agentId ? { agentId: updated.agentId } : {}),
      })
    : null;

  return {
    flag: updated,
    trustSummary: trust
      ? {
          score: trust.trustScore.score,
          trustTier: trust.trustScore.tier,
          riskTier: trust.riskTier,
          explanations: trust.factors.map((factor) => factor.explanation),
        }
      : null,
  };
});

app.post("/v1/trust-cards", async (request, reply) => {
  const auth = await requirePermission(request, reply, "trust_cards:write");
  if (!auth) {
    return;
  }

  const parsed = trustCardCreateSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.code(400).send({ code: "BAD_REQUEST", message: parsed.error.message });
  }

  const subject = await prisma.subject.findFirst({
    where: { id: parsed.data.subjectId, tenantId: auth.tenantId },
  });
  if (!subject) {
    return reply.code(404).send({ code: "NOT_FOUND", message: "Subject not found." });
  }

  const trustCard = await prisma.trustCard.upsert({
    where: { slug: parsed.data.slug },
    update: {
      headline: parsed.data.headline,
      summary: parsed.data.summary,
      subjectId: parsed.data.subjectId,
      tenantId: auth.tenantId,
    },
    create: {
      tenantId: auth.tenantId,
      subjectId: parsed.data.subjectId,
      slug: parsed.data.slug,
      headline: parsed.data.headline,
      summary: parsed.data.summary,
      isPublic: false,
    },
  });

  return trustCard;
});

app.post("/v1/trust-cards/:id/publish", async (request, reply) => {
  const auth = await requirePermission(request, reply, "trust_cards:write");
  if (!auth) {
    return;
  }

  const params = z.object({ id: z.string().min(1) }).safeParse(request.params);
  if (!params.success) {
    return reply.code(400).send({ code: "BAD_REQUEST", message: params.error.message });
  }

  const trustCard = await prisma.trustCard.findFirst({
    where: { id: params.data.id, tenantId: auth.tenantId },
  });
  if (!trustCard) {
    return reply.code(404).send({ code: "NOT_FOUND", message: "Trust card not found." });
  }

  const updated = await prisma.trustCard.update({
    where: { id: trustCard.id },
    data: {
      isPublic: true,
      lastPublishedAt: new Date(),
    },
  });

  return updated;
});

app.get("/v1/trust-cards/:slug", async (request, reply) => {
  const params = z.object({ slug: z.string().min(3) }).safeParse(request.params);
  if (!params.success) {
    return reply.code(400).send({ code: "BAD_REQUEST", message: params.error.message });
  }

  const trustCard = await prisma.trustCard.findUnique({
    where: { slug: params.data.slug },
    include: {
      subject: {
        include: {
          verificationClaims: {
            where: { revokedAt: null },
            orderBy: { issuedAt: "desc" },
            take: 10,
          },
        },
      },
    },
  });
  if (!trustCard || !trustCard.isPublic) {
    return reply.code(404).send({ code: "NOT_FOUND", message: "Trust card not found." });
  }

  return {
    slug: trustCard.slug,
    headline: trustCard.headline,
    summary: trustCard.summary,
    subject: {
      id: trustCard.subject.id,
      displayName: trustCard.subject.displayName,
      subjectType: trustCard.subject.subjectType,
      status: trustCard.subject.status,
    },
    badges: trustCard.subject.verificationClaims.map((claim) => ({
      claimType: claim.claimType,
      claimLevel: claim.claimLevel,
      issuer: claim.issuer,
      issuedAt: claim.issuedAt,
      expiresAt: claim.expiresAt,
    })),
    publishedAt: trustCard.lastPublishedAt,
  };
});

app.post("/v1/webhooks", async (request, reply) => {
  const auth = await requirePermission(request, reply, "webhooks:write");
  if (!auth) {
    return;
  }

  const parsed = webhookCreateSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.code(400).send({ code: "BAD_REQUEST", message: parsed.error.message });
  }

  const endpoint = await prisma.webhookEndpoint.create({
    data: {
      tenantId: auth.tenantId,
      url: parsed.data.url,
      signingSecret: parsed.data.signingSecret,
      subscribedEvents: parsed.data.subscribedEvents,
      status: "ACTIVE",
    },
  });

  return endpoint;
});

app.get("/v1/webhooks", async (request, reply) => {
  const auth = await requirePermission(request, reply, "webhooks:read");
  if (!auth) {
    return;
  }

  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { tenantId: auth.tenantId },
    orderBy: { createdAt: "desc" },
  });
  return endpoints;
});

app.post("/v1/webhooks/:id/replay", async (request, reply) => {
  const auth = await requirePermission(request, reply, "webhooks:write");
  if (!auth) {
    return;
  }

  const params = z.object({ id: z.string().min(1) }).safeParse(request.params);
  if (!params.success) {
    return reply.code(400).send({ code: "BAD_REQUEST", message: params.error.message });
  }

  const failedDelivery = await prisma.webhookDelivery.findFirst({
    where: {
      webhookEndpointId: params.data.id,
      tenantId: auth.tenantId,
      status: "FAILED",
    },
    orderBy: { createdAt: "desc" },
  });
  if (!failedDelivery) {
    return reply
      .code(404)
      .send({ code: "NOT_FOUND", message: "No failed webhook delivery available for replay." });
  }

  const replay = await prisma.webhookDelivery.create({
    data: {
      tenantId: failedDelivery.tenantId,
      webhookEndpointId: failedDelivery.webhookEndpointId,
      eventType: failedDelivery.eventType,
      eventPayload: failedDelivery.eventPayload as any,
      status: "QUEUED",
    },
  });

  await webhookQueue.add(
    "deliver-webhook",
    { deliveryId: replay.id },
    { attempts: 3, backoff: { type: "exponential", delay: 2000 }, removeOnComplete: true },
  );

  return replay;
});

app.post("/v1/actions/sign", async (request, reply) => {
  const auth = await requirePermission(request, reply, "actions:sign");
  if (!auth) {
    return;
  }
  const idempotencyKey =
    typeof request.headers["x-idempotency-key"] === "string"
      ? request.headers["x-idempotency-key"]
      : undefined;
  const cached = await getIdempotencyCachedResponse({
    tenantId: auth.tenantId,
    routeKey: "POST:/v1/actions/sign",
    key: idempotencyKey,
  });
  if (cached) {
    return reply.code(cached.statusCode).send(cached.payload);
  }

  const parsed = actionSignSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.code(400).send({ code: "BAD_REQUEST", message: parsed.error.message });
  }

  const subject = await prisma.subject.findFirst({
    where: { id: parsed.data.subjectId, tenantId: auth.tenantId },
  });
  if (!subject) {
    return reply.code(404).send({ code: "NOT_FOUND", message: "Subject not found." });
  }

  if (parsed.data.agentSubjectId) {
    const agent = await prisma.subject.findFirst({
      where: {
        id: parsed.data.agentSubjectId,
        tenantId: auth.tenantId,
        subjectType: "AGENT",
      },
    });
    if (!agent) {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Agent subject not found." });
    }
  }

  if (parsed.data.decisionRefId) {
    const decision = await prisma.trustDecision.findFirst({
      where: { id: parsed.data.decisionRefId, tenantId: auth.tenantId },
    });
    if (!decision) {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Decision reference not found." });
    }
  }

  const nonce = randomBytes(16).toString("hex");
  const payloadHash = sha256(JSON.stringify(parsed.data.payload));
  const signature = signActionDigest(payloadHash, nonce);
  const expiresAt = new Date(Date.now() + parsed.data.ttlSeconds * 1000);

  const action = await prisma.$transaction(async (tx) => {
    await tx.replayNonce.create({
      data: {
        tenantId: auth.tenantId,
        nonce,
        expiresAt,
      },
    });

    const createdAction = await tx.signedAction.create({
      data: {
        tenantId: auth.tenantId,
        subjectId: parsed.data.subjectId,
        agentSubjectId: parsed.data.agentSubjectId,
        contextType: parsed.data.contextType,
        actionType: parsed.data.actionType,
        resourceType: parsed.data.resourceType,
        resourceId: parsed.data.resourceId,
        decisionRefId: parsed.data.decisionRefId,
        payloadHash,
        nonce,
        signature,
        expiresAt,
        verificationStatus: "PENDING",
      },
    });

    return createdAction;
  });

  await appendAuditEvent({
    tenantId: auth.tenantId,
    actorType: "USER",
    actorRef: auth.userId,
    eventType: "SIGNED_ACTION_CREATED",
    entityType: "SignedAction",
    entityId: action.id,
    dataJson: {
      subjectId: action.subjectId,
      actionType: action.actionType,
      resourceType: action.resourceType,
      resourceId: action.resourceId,
      contextType: action.contextType,
      expiresAt: action.expiresAt.toISOString(),
    },
  });

  await enqueueWebhookDeliveries({
    tenantId: auth.tenantId,
    eventType: "actions.signed",
    payload: {
      actionId: action.id,
      actionType: action.actionType,
      subjectId: action.subjectId,
      verificationStatus: action.verificationStatus,
      expiresAt: action.expiresAt.toISOString(),
    },
  });

  const responseBody = {
    id: action.id,
    nonce: action.nonce,
    signature: action.signature,
    expiresAt: action.expiresAt,
    verificationStatus: action.verificationStatus,
  };
  await saveIdempotencyResponse({
    tenantId: auth.tenantId,
    routeKey: "POST:/v1/actions/sign",
    key: idempotencyKey,
    statusCode: 200,
    payload: responseBody,
  });
  return responseBody;
});

app.post("/v1/actions/verify", async (request, reply) => {
  const auth = await requirePermission(request, reply, "actions:verify");
  if (!auth) {
    return;
  }

  const parsed = actionVerifySchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.code(400).send({ code: "BAD_REQUEST", message: parsed.error.message });
  }

  const action = await prisma.signedAction.findFirst({
    where: {
      id: parsed.data.actionId,
      tenantId: auth.tenantId,
    },
  });
  if (!action) {
    return reply.code(404).send({ code: "NOT_FOUND", message: "Signed action not found." });
  }

  if (action.verificationStatus === "VERIFIED") {
    return reply
      .code(409)
      .send({ code: "REPLAY_DETECTED", message: "Signed action already verified once." });
  }

  const nonce = await prisma.replayNonce.findUnique({
    where: {
      tenantId_nonce: {
        tenantId: auth.tenantId,
        nonce: action.nonce,
      },
    },
  });

  if (!nonce) {
    return reply.code(409).send({ code: "REPLAY_MISSING_NONCE", message: "Nonce missing." });
  }

  const now = new Date();
  if (action.expiresAt.getTime() < now.getTime()) {
    await prisma.signedAction.update({
      where: { id: action.id },
      data: {
        verificationStatus: "EXPIRED",
      },
    });
    return reply.code(410).send({ code: "ACTION_EXPIRED", message: "Signed action expired." });
  }

  const payloadHash = sha256(JSON.stringify(parsed.data.payload));
  const expectedSignature = signActionDigest(payloadHash, action.nonce);
  const valid = payloadHash === action.payloadHash && expectedSignature === action.signature;

  const updated = await prisma.signedAction.update({
    where: { id: action.id },
    data: {
      verifiedAt: now,
      verificationStatus: valid ? "VERIFIED" : "INVALID",
    },
  });

  await appendAuditEvent({
    tenantId: auth.tenantId,
    actorType: "USER",
    actorRef: auth.userId,
    eventType: valid ? "SIGNED_ACTION_VERIFIED" : "SIGNED_ACTION_INVALID",
    entityType: "SignedAction",
    entityId: action.id,
    dataJson: {
      verificationStatus: updated.verificationStatus,
      checkedAt: now.toISOString(),
    },
  });

  await enqueueWebhookDeliveries({
    tenantId: auth.tenantId,
    eventType: valid ? "actions.verified" : "actions.invalid",
    payload: {
      actionId: updated.id,
      valid,
      verificationStatus: updated.verificationStatus,
      verifiedAt: updated.verifiedAt?.toISOString() ?? null,
    },
  });

  return {
    id: updated.id,
    valid,
    verificationStatus: updated.verificationStatus,
    verifiedAt: updated.verifiedAt,
  };
});

app.get("/v1/actions/:actionId", async (request, reply) => {
  const auth = await requirePermission(request, reply, "actions:read");
  if (!auth) {
    return;
  }

  const params = z.object({ actionId: z.string().min(1) }).safeParse(request.params);
  if (!params.success) {
    return reply.code(400).send({ code: "BAD_REQUEST", message: params.error.message });
  }

  const action = await prisma.signedAction.findFirst({
    where: { id: params.data.actionId, tenantId: auth.tenantId },
  });
  if (!action) {
    return reply.code(404).send({ code: "NOT_FOUND", message: "Signed action not found." });
  }

  return action;
});

app.get("/v1/audit/events", async (request, reply) => {
  const auth = await requirePermission(request, reply, "audit:read");
  if (!auth) {
    return;
  }

  const query = z
    .object({
      limit: z.coerce.number().min(1).max(100).default(50),
      offset: z.coerce.number().min(0).default(0),
      eventType: z.string().optional(),
    })
    .safeParse(request.query);
  if (!query.success) {
    return reply.code(400).send({ code: "BAD_REQUEST", message: query.error.message });
  }

  const where = {
    tenantId: auth.tenantId,
    ...(query.data.eventType ? { eventType: query.data.eventType } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.auditEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: query.data.limit,
      skip: query.data.offset,
    }),
    prisma.auditEvent.count({ where }),
  ]);

  return {
    items,
    total,
    limit: query.data.limit,
    offset: query.data.offset,
  };
});

app.get("/v1/tenants/:tenantId/protected", async (request, reply) => {
  const params = z.object({ tenantId: z.string().min(1) }).safeParse(request.params);
  if (!params.success) {
    return reply.code(400).send({ code: "BAD_REQUEST", message: "Invalid tenant id." });
  }

  const auth = await requireRole(request, reply, ["OWNER", "ADMIN"]);
  if (!auth) {
    return;
  }

  if (auth.tenantId !== params.data.tenantId) {
    return reply.code(403).send({ code: "FORBIDDEN", message: "Cross-tenant access denied." });
  }

  return {
    ok: true,
    tenantId: auth.tenantId,
    userId: auth.userId,
    role: auth.role,
  };
});

const port = apiEnv.API_PORT;
await app.listen({ port, host: "0.0.0.0" });
apiLogger.info("API server started", { port });
