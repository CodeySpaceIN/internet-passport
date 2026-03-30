"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@internet-passport/db";
import { getServerSessionOrRedirect } from "@/lib/auth/server";
import { getTenantIdFromSession } from "@/lib/data/app-dashboard";
import { writeAuditAndSignedAction } from "@/lib/audit/service";

export type ApiKeyActionState = {
  ok: boolean;
  error?: string;
  createdSecret?: string;
  createdPrefix?: string;
};

const initialState: ApiKeyActionState = { ok: true };

function parseScopes(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function createDeveloperApiKeyAction(
  prevState: ApiKeyActionState = initialState,
  formData: FormData,
): Promise<ApiKeyActionState> {
  void prevState;
  const session = await getServerSessionOrRedirect();
  const tenantId = getTenantIdFromSession(session);
  if (!tenantId) {
    return { ok: false, error: "Missing tenant context." };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { ok: false, error: "Name is required." };
  }
  const scopes = parseScopes(String(formData.get("scopes") ?? ""));
  if (scopes.length === 0) {
    return { ok: false, error: "At least one scope is required." };
  }
  const organizationIdRaw = String(formData.get("organizationId") ?? "").trim();
  const organizationId = organizationIdRaw || null;

  const rawKey = `ip_live_${randomBytes(24).toString("hex")}`;
  const keyPrefix = rawKey.slice(0, 14);
  const keyHash = createHash("sha256").update(rawKey).digest("hex");

  const created = await prisma.apiKey.create({
    data: {
      tenantId,
      userId: session.user.id,
      organizationId,
      name,
      keyPrefix,
      keyHash,
      scopes,
      status: "ACTIVE",
    },
  });

  await writeAuditAndSignedAction(
    {
      tenantId,
      actor: { type: "USER", userId: session.user.id },
      targetType: "ApiKey",
      targetId: created.id,
      actionType: "API_KEY_CREATED",
      outcome: "SUCCESS",
      orgId: organizationId ?? undefined,
      metadata: {
        name: created.name,
        keyPrefix: created.keyPrefix,
        scopes: created.scopes,
      },
    },
    {
      actionType: "API_KEY_CREATED",
      targetType: "ApiKey",
      targetId: created.id,
      payload: {
        name: created.name,
        keyPrefix: created.keyPrefix,
        scopes: created.scopes,
      },
      contextType: "developer_api",
      orgId: organizationId ?? undefined,
    },
  );

  revalidatePath("/app/api");
  return { ok: true, createdSecret: rawKey, createdPrefix: keyPrefix };
}

export async function revokeDeveloperApiKeyAction(formData: FormData) {
  const session = await getServerSessionOrRedirect();
  const tenantId = getTenantIdFromSession(session);
  if (!tenantId) {
    return;
  }
  const keyId = String(formData.get("apiKeyId") ?? "").trim();
  if (!keyId) {
    return;
  }
  const key = await prisma.apiKey.findFirst({
    where: { id: keyId, tenantId },
  });
  if (!key) {
    return;
  }

  await prisma.apiKey.update({
    where: { id: key.id },
    data: {
      status: "REVOKED",
      revokedAt: new Date(),
    },
  });

  await writeAuditAndSignedAction(
    {
      tenantId,
      actor: { type: "USER", userId: session.user.id },
      targetType: "ApiKey",
      targetId: key.id,
      actionType: "API_KEY_REVOKED",
      outcome: "SUCCESS",
      orgId: key.organizationId ?? undefined,
      metadata: { keyPrefix: key.keyPrefix, status: "REVOKED" },
    },
    {
      actionType: "API_KEY_REVOKED",
      targetType: "ApiKey",
      targetId: key.id,
      payload: { keyPrefix: key.keyPrefix, status: "REVOKED" },
      contextType: "developer_api",
      orgId: key.organizationId ?? undefined,
    },
  );

  revalidatePath("/app/api");
}
