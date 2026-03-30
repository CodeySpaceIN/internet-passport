"use server";

import { randomBytes, createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { prisma } from "@internet-passport/db";
import { recalculateAndPersistTrust } from "@internet-passport/trust-engine";
import { getServerSessionOrRedirect } from "@/lib/auth/server";
import { getTenantIdFromSession } from "@/lib/data/app-dashboard";
import { requireOrganizationAccess } from "@/lib/org/access";
import { writeAuditAndSignedAction } from "@/lib/audit/service";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

async function createAuditLog(input: {
  tenantId: string;
  actorUserId: string;
  actionType: string;
  resourceType: string;
  resourceId?: string;
  outcome?: "SUCCESS" | "FAILURE";
  metadataJson?: Record<string, unknown>;
  signPayload?: Record<string, unknown>;
  orgId?: string;
}) {
  await writeAuditAndSignedAction(
    {
      tenantId: input.tenantId,
      actor: { type: "USER", userId: input.actorUserId },
      actionType: input.actionType,
      targetType: input.resourceType,
      targetId: input.resourceId,
      orgId: input.orgId,
      outcome: input.outcome ?? "SUCCESS",
      metadata: input.metadataJson,
    },
    input.signPayload
      ? {
          actionType: input.actionType,
          targetType: input.resourceType,
          targetId: input.resourceId ?? "unknown",
          payload: input.signPayload,
          orgId: input.orgId,
        }
      : undefined,
  );
}

function parseScopes(input: string) {
  return input
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseCapabilities(input: string) {
  return input
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 30);
}

function mapLifecycleToAgentStatus(lifecycle: string) {
  if (lifecycle === "active") return "ACTIVE" as const;
  if (lifecycle === "suspended") return "PAUSED" as const;
  return "PAUSED" as const;
}

export async function createOrganizationAction(formData: FormData) {
  const session = await getServerSessionOrRedirect();
  const tenantId = getTenantIdFromSession(session);
  if (!tenantId) return;

  const name = String(formData.get("name") ?? "").trim();
  const websiteUrl = String(formData.get("websiteUrl") ?? "").trim();
  const legalName = String(formData.get("legalName") ?? "").trim();
  if (!name) {
    throw new Error("Organization name is required.");
  }

  const baseSlug = slugify(name) || "organization";
  const slug = `${baseSlug}-${randomBytes(2).toString("hex")}`;

  const created = await prisma.organization.create({
    data: {
      tenantId,
      ownerUserId: session.user.id,
      name,
      slug,
      legalName: legalName || null,
      websiteUrl: websiteUrl || null,
    },
  });

  await prisma.organizationMember.create({
    data: {
      organizationId: created.id,
      userId: session.user.id,
      role: "OWNER",
      invitedByUserId: session.user.id,
    },
  });

  await createAuditLog({
    tenantId,
    actorUserId: session.user.id,
    actionType: "ORG_CREATED",
    resourceType: "Organization",
    resourceId: created.id,
    metadataJson: { name: created.name, slug: created.slug },
    signPayload: { name: created.name, slug: created.slug },
    orgId: created.id,
  });

  revalidatePath("/app/organizations");
}

export async function inviteOrganizationMemberAction(formData: FormData) {
  const session = await getServerSessionOrRedirect();
  const tenantId = getTenantIdFromSession(session);
  if (!tenantId) return;
  const orgId = String(formData.get("orgId") ?? "");
  requireOrganizationAccess(session, orgId, "manage");

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "DEVELOPER").trim();
  if (!email) {
    throw new Error("Member email is required.");
  }

  const user =
    (await prisma.user.findUnique({ where: { email } })) ??
    (await prisma.user.create({
      data: {
        email,
        name: email.split("@")[0],
      },
    }));

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: orgId,
        userId: user.id,
      },
    },
    update: {
      role: role as any,
      invitedByUserId: session.user.id,
    },
    create: {
      organizationId: orgId,
      userId: user.id,
      role: role as any,
      invitedByUserId: session.user.id,
    },
  });

  await createAuditLog({
    tenantId,
    actorUserId: session.user.id,
    actionType: "ORG_MEMBER_INVITED",
    resourceType: "OrganizationMember",
    resourceId: orgId,
    metadataJson: { orgId, userId: user.id, email, role },
  });

  revalidatePath(`/app/organizations/${orgId}/members`);
  revalidatePath(`/app/organizations/${orgId}`);
}

export async function updateOrganizationMemberRoleAction(formData: FormData) {
  const session = await getServerSessionOrRedirect();
  const tenantId = getTenantIdFromSession(session);
  if (!tenantId) return;
  const orgId = String(formData.get("orgId") ?? "");
  requireOrganizationAccess(session, orgId, "manage");

  const membershipId = String(formData.get("membershipId") ?? "");
  const role = String(formData.get("role") ?? "").trim();
  if (!membershipId || !role) return;

  await prisma.organizationMember.update({
    where: { id: membershipId },
    data: { role: role as any },
  });

  await createAuditLog({
    tenantId,
    actorUserId: session.user.id,
    actionType: "ORG_MEMBER_ROLE_UPDATED",
    resourceType: "OrganizationMember",
    resourceId: membershipId,
    metadataJson: { orgId, role },
  });

  revalidatePath(`/app/organizations/${orgId}/members`);
}

export async function removeOrganizationMemberAction(formData: FormData) {
  const session = await getServerSessionOrRedirect();
  const tenantId = getTenantIdFromSession(session);
  if (!tenantId) return;
  const orgId = String(formData.get("orgId") ?? "");
  requireOrganizationAccess(session, orgId, "manage");

  const membershipId = String(formData.get("membershipId") ?? "");
  if (!membershipId) return;

  const target = await prisma.organizationMember.findUnique({
    where: { id: membershipId },
    include: { organization: true },
  });
  if (!target || target.organizationId !== orgId || target.organization.tenantId !== tenantId) {
    return;
  }

  const ownerCount = await prisma.organizationMember.count({
    where: { organizationId: orgId, role: "OWNER" },
  });
  if (target.role === "OWNER" && ownerCount <= 1) {
    throw new Error("Cannot remove the last organization owner.");
  }

  await prisma.organizationMember.delete({
    where: { id: membershipId },
  });

  await createAuditLog({
    tenantId,
    actorUserId: session.user.id,
    actionType: "ORG_MEMBER_REMOVED",
    resourceType: "OrganizationMember",
    resourceId: membershipId,
    metadataJson: { orgId, removedUserId: target.userId },
  });

  revalidatePath(`/app/organizations/${orgId}/members`);
  revalidatePath(`/app/organizations/${orgId}`);
}

export async function createDomainChallengeAction(formData: FormData) {
  const session = await getServerSessionOrRedirect();
  const tenantId = getTenantIdFromSession(session);
  if (!tenantId) return;
  const orgId = String(formData.get("orgId") ?? "");
  requireOrganizationAccess(session, orgId, "manage");

  const domain = String(formData.get("domain") ?? "").trim().toLowerCase();
  if (!domain) {
    throw new Error("Domain is required.");
  }
  const challengeToken = `ip-challenge-${randomBytes(8).toString("hex")}`;

  const domainRecord = await prisma.domainVerification.upsert({
    where: {
      organizationId_domain: {
        organizationId: orgId,
        domain,
      },
    },
    update: {
      status: "PENDING",
      challengeToken,
      verifiedAt: null,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    },
    create: {
      organizationId: orgId,
      domain,
      status: "PENDING",
      challengeToken,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    },
  });

  await prisma.verificationRecord.create({
    data: {
      tenantId,
      organizationId: orgId,
      requestedByUserId: session.user.id,
      verificationType: "DOMAIN",
      provider: "INTERNAL",
      state: "IN_PROGRESS",
      externalRef: domainRecord.id,
      evidenceJson: {
        domain,
        challengeToken,
      },
    },
  });

  await createAuditLog({
    tenantId,
    actorUserId: session.user.id,
    actionType: "ORG_DOMAIN_CHALLENGE_CREATED",
    resourceType: "DomainVerification",
    resourceId: domainRecord.id,
    metadataJson: { orgId, domain },
    signPayload: { domain, challengeRef: domainRecord.id },
    orgId,
  });

  revalidatePath(`/app/organizations/${orgId}/domains`);
}

export async function verifyDomainChallengeAction(formData: FormData) {
  const session = await getServerSessionOrRedirect();
  const tenantId = getTenantIdFromSession(session);
  if (!tenantId) return;
  const orgId = String(formData.get("orgId") ?? "");
  requireOrganizationAccess(session, orgId, "manage");
  const domainVerificationId = String(formData.get("domainVerificationId") ?? "");
  if (!domainVerificationId) return;

  const domain = await prisma.domainVerification.findUnique({ where: { id: domainVerificationId } });
  if (!domain) return;

  await prisma.domainVerification.update({
    where: { id: domainVerificationId },
    data: {
      status: "VERIFIED",
      verifiedAt: new Date(),
    },
  });

  const verificationRecord = await prisma.verificationRecord.create({
    data: {
      tenantId,
      organizationId: orgId,
      requestedByUserId: session.user.id,
      reviewedByUserId: session.user.id,
      verificationType: "DOMAIN",
      provider: "INTERNAL",
      state: "PASSED",
      confidenceScore: 0.95,
      externalRef: domainVerificationId,
      completedAt: new Date(),
      evidenceJson: {
        domain: domain.domain,
        challengeToken: domain.challengeToken,
        verifiedBy: "mock_dns_proof",
      },
    },
  });

  await recalculateAndPersistTrust({
    tenantId,
    actorUserId: session.user.id,
    organizationId: orgId,
    trigger: "verification_completion",
    verificationRecordId: verificationRecord.id,
  });

  await createAuditLog({
    tenantId,
    actorUserId: session.user.id,
    actionType: "ORG_DOMAIN_VERIFIED",
    resourceType: "DomainVerification",
    resourceId: domainVerificationId,
    metadataJson: { orgId, domain: domain.domain },
    signPayload: { domain: domain.domain, verificationRecordId: verificationRecord.id },
    orgId,
  });

  revalidatePath(`/app/organizations/${orgId}/domains`);
  revalidatePath(`/app/organizations/${orgId}`);
}

export async function createOrganizationApiKeyAction(formData: FormData) {
  const session = await getServerSessionOrRedirect();
  const tenantId = getTenantIdFromSession(session);
  if (!tenantId) return;
  const orgId = String(formData.get("orgId") ?? "");
  requireOrganizationAccess(session, orgId, "manage");

  const name = String(formData.get("name") ?? "").trim();
  const scopes = parseScopes(String(formData.get("scopes") ?? "verifications:write,trust:evaluate"));
  if (!name) {
    throw new Error("API key name is required.");
  }
  const rawKey = `ip_org_${randomBytes(20).toString("hex")}`;
  const keyPrefix = rawKey.slice(0, 16);
  const keyHash = createHash("sha256").update(rawKey).digest("hex");

  await prisma.apiKey.create({
    data: {
      tenantId,
      organizationId: orgId,
      name,
      keyPrefix,
      keyHash,
      scopes,
      status: "ACTIVE",
    },
  });

  await createAuditLog({
    tenantId,
    actorUserId: session.user.id,
    actionType: "ORG_API_KEY_CREATED",
    resourceType: "ApiKey",
    resourceId: keyPrefix,
    metadataJson: { orgId, name, keyPrefix, scopes },
    signPayload: { name, keyPrefix, scopes },
    orgId,
  });

  revalidatePath(`/app/organizations/${orgId}`);
}

export async function revokeOrganizationApiKeyAction(formData: FormData) {
  const session = await getServerSessionOrRedirect();
  const tenantId = getTenantIdFromSession(session);
  if (!tenantId) return;
  const orgId = String(formData.get("orgId") ?? "");
  requireOrganizationAccess(session, orgId, "manage");

  const apiKeyId = String(formData.get("apiKeyId") ?? "");
  if (!apiKeyId) return;
  await prisma.apiKey.update({
    where: { id: apiKeyId },
    data: { status: "REVOKED", revokedAt: new Date() },
  });

  await createAuditLog({
    tenantId,
    actorUserId: session.user.id,
    actionType: "ORG_API_KEY_REVOKED",
    resourceType: "ApiKey",
    resourceId: apiKeyId,
    metadataJson: { orgId },
    signPayload: { apiKeyId, status: "REVOKED" },
    orgId,
  });

  revalidatePath(`/app/organizations/${orgId}`);
}

export async function createOrganizationAgentAction(formData: FormData) {
  const session = await getServerSessionOrRedirect();
  const tenantId = getTenantIdFromSession(session);
  if (!tenantId) return;
  const orgId = String(formData.get("orgId") ?? "");
  requireOrganizationAccess(session, orgId, "manage");

  const displayName = String(formData.get("displayName") ?? "").trim();
  const handle = String(formData.get("handle") ?? "").trim();
  const purpose = String(formData.get("purpose") ?? "").trim();
  const capabilities = parseCapabilities(String(formData.get("capabilities") ?? ""));
  const lifecycleStatus = String(formData.get("lifecycleStatus") ?? "pending").trim().toLowerCase();
  const description = String(formData.get("description") ?? "").trim();
  if (!displayName) {
    throw new Error("Agent display name is required.");
  }
  if (!handle) {
    throw new Error("Agent handle is required.");
  }

  const slug = slugify(handle);
  const existing = await prisma.agent.findFirst({
    where: {
      tenantId,
      OR: [{ slug }, { displayName }],
    },
  });
  if (existing) {
    throw new Error("Agent handle or display name already exists in this tenant.");
  }
  const agent = await prisma.agent.create({
    data: {
      tenantId,
      organizationId: orgId,
      managerUserId: session.user.id,
      displayName,
      slug,
      description: purpose || description || null,
      status: mapLifecycleToAgentStatus(lifecycleStatus),
      metadataJson: {
        lifecycleStatus,
        handle,
        purpose,
        capabilities,
        signedIdentityModel: {
          status: "placeholder",
          type: "future_attestation_envelope",
        },
      },
    },
  });

  await createAuditLog({
    tenantId,
    actorUserId: session.user.id,
    actionType: "ORG_AGENT_CREATED",
    resourceType: "Agent",
    resourceId: agent.id,
    metadataJson: {
      orgId,
      displayName: agent.displayName,
      handle,
      lifecycleStatus,
      capabilities,
    },
    signPayload: {
      agentId: agent.id,
      displayName: agent.displayName,
      handle,
      lifecycleStatus,
      capabilities,
    },
    orgId,
  });

  revalidatePath(`/app/organizations/${orgId}/agents`);
  revalidatePath(`/app/organizations/${orgId}`);
}

export async function updateOrganizationSettingsAction(formData: FormData) {
  const session = await getServerSessionOrRedirect();
  const tenantId = getTenantIdFromSession(session);
  if (!tenantId) return;
  const orgId = String(formData.get("orgId") ?? "");
  requireOrganizationAccess(session, orgId, "manage");

  const name = String(formData.get("name") ?? "").trim();
  const legalName = String(formData.get("legalName") ?? "").trim();
  const websiteUrl = String(formData.get("websiteUrl") ?? "").trim();
  const orgType = String(formData.get("organizationType") ?? "").trim();

  if (!name) {
    throw new Error("Organization name cannot be empty.");
  }
  if (websiteUrl && !/^https?:\/\//.test(websiteUrl)) {
    throw new Error("Website URL must start with http:// or https://");
  }

  const updated = await prisma.organization.update({
    where: { id: orgId },
    data: {
      name,
      legalName: legalName || null,
      websiteUrl: websiteUrl || null,
      organizationType: orgType as any,
    },
  });

  await createAuditLog({
    tenantId,
    actorUserId: session.user.id,
    actionType: "ORG_SETTINGS_UPDATED",
    resourceType: "Organization",
    resourceId: orgId,
    metadataJson: {
      name: updated.name,
      organizationType: updated.organizationType,
    },
    signPayload: {
      name: updated.name,
      organizationType: updated.organizationType,
      websiteUrl: updated.websiteUrl,
    },
    orgId,
  });

  revalidatePath(`/app/organizations/${orgId}`);
  revalidatePath(`/app/organizations/${orgId}/settings`);
}

export async function updateOrganizationAgentStatusAction(formData: FormData) {
  const session = await getServerSessionOrRedirect();
  const tenantId = getTenantIdFromSession(session);
  if (!tenantId) return;
  const orgId = String(formData.get("orgId") ?? "");
  requireOrganizationAccess(session, orgId, "manage");

  const agentId = String(formData.get("agentId") ?? "");
  const lifecycleStatus = String(formData.get("lifecycleStatus") ?? "active").trim().toLowerCase();
  if (!agentId) return;
  const existing = await prisma.agent.findUnique({
    where: { id: agentId },
  });
  if (!existing) return;
  const existingMeta =
    typeof existing.metadataJson === "object" && existing.metadataJson !== null
      ? (existing.metadataJson as Record<string, unknown>)
      : {};
  await prisma.agent.update({
    where: { id: agentId },
    data: {
      status: mapLifecycleToAgentStatus(lifecycleStatus),
      metadataJson: {
        ...existingMeta,
        lifecycleStatus,
      } as any,
    },
  });

  await createAuditLog({
    tenantId,
    actorUserId: session.user.id,
    actionType: "ORG_AGENT_STATUS_UPDATED",
    resourceType: "Agent",
    resourceId: agentId,
    metadataJson: { orgId, lifecycleStatus },
    signPayload: { agentId, lifecycleStatus },
    orgId,
  });

  revalidatePath(`/app/organizations/${orgId}/agents`);
  revalidatePath(`/app/agents/${agentId}`);
}

export type AgentCredentialActionState = {
  ok: boolean;
  message?: string;
  secret?: string;
  credentialId?: string;
};

async function assertAgentManageAccess(agentId: string) {
  const session = await getServerSessionOrRedirect();
  const tenantId = getTenantIdFromSession(session);
  if (!tenantId) {
    throw new Error("No tenant context.");
  }
  const agent = await prisma.agent.findFirst({
    where: { id: agentId, tenantId },
  });
  if (!agent?.organizationId) {
    throw new Error("Agent organization not found.");
  }
  requireOrganizationAccess(session, agent.organizationId, "manage");
  return { session, tenantId, agent };
}

export async function issueAgentCredentialAction(
  _state: AgentCredentialActionState,
  formData: FormData,
): Promise<AgentCredentialActionState> {
  const agentId = String(formData.get("agentId") ?? "");
  const credentialType = String(formData.get("credentialType") ?? "API_KEY");
  const expiresInDays = Number(String(formData.get("expiresInDays") ?? "90"));
  if (!agentId) {
    return { ok: false, message: "Missing agent id." };
  }
  try {
    const { session, tenantId, agent } = await assertAgentManageAccess(agentId);
    const rawSecret = `ip_agent_${randomBytes(28).toString("hex")}`;
    const keyHash = createHash("sha256").update(rawSecret).digest("hex");
    const keyId = `agk_${randomBytes(8).toString("hex")}`;
    const expiresAt = Number.isFinite(expiresInDays)
      ? new Date(Date.now() + Math.max(1, expiresInDays) * 24 * 60 * 60 * 1000)
      : null;
    const credential = await prisma.agentCredential.create({
      data: {
        tenantId,
        agentId,
        credentialType: credentialType as any,
        keyId,
        keyHash,
        algorithm: "HS256",
        expiresAt,
      },
    });

    await createAuditLog({
      tenantId,
      actorUserId: session.user.id,
      actionType: "AGENT_CREDENTIAL_ISSUED",
      resourceType: "AgentCredential",
      resourceId: credential.id,
      metadataJson: {
        agentId,
        orgId: agent.organizationId,
        keyId,
        credentialType,
      },
    });

    revalidatePath(`/app/agents/${agentId}`);
    revalidatePath(`/app/organizations/${agent.organizationId}/agents`);
    return {
      ok: true,
      message: "Credential issued. Copy the secret now; it will not be shown again.",
      secret: rawSecret,
      credentialId: credential.id,
    };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Failed to issue credential." };
  }
}

export async function rotateAgentCredentialAction(
  _state: AgentCredentialActionState,
  formData: FormData,
): Promise<AgentCredentialActionState> {
  const agentId = String(formData.get("agentId") ?? "");
  if (!agentId) {
    return { ok: false, message: "Missing agent id." };
  }
  try {
    const { session, tenantId, agent } = await assertAgentManageAccess(agentId);
    await prisma.agentCredential.updateMany({
      where: {
        tenantId,
        agentId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    const rawSecret = `ip_agent_${randomBytes(28).toString("hex")}`;
    const keyHash = createHash("sha256").update(rawSecret).digest("hex");
    const keyId = `agk_${randomBytes(8).toString("hex")}`;
    const credential = await prisma.agentCredential.create({
      data: {
        tenantId,
        agentId,
        credentialType: "API_KEY",
        keyId,
        keyHash,
        algorithm: "HS256",
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
    });

    await createAuditLog({
      tenantId,
      actorUserId: session.user.id,
      actionType: "AGENT_CREDENTIAL_ROTATED",
      resourceType: "AgentCredential",
      resourceId: credential.id,
      metadataJson: {
        agentId,
        orgId: agent.organizationId,
        keyId,
      },
    });

    revalidatePath(`/app/agents/${agentId}`);
    revalidatePath(`/app/organizations/${agent.organizationId}/agents`);
    return {
      ok: true,
      message: "Credential rotated. Store the new secret now.",
      secret: rawSecret,
      credentialId: credential.id,
    };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Failed to rotate credential." };
  }
}

export async function revokeAgentCredentialAction(formData: FormData) {
  const agentId = String(formData.get("agentId") ?? "");
  const credentialId = String(formData.get("credentialId") ?? "");
  if (!agentId || !credentialId) return;
  const { session, tenantId, agent } = await assertAgentManageAccess(agentId);
  await prisma.agentCredential.update({
    where: { id: credentialId },
    data: { revokedAt: new Date() },
  });

  await createAuditLog({
    tenantId,
    actorUserId: session.user.id,
    actionType: "AGENT_CREDENTIAL_REVOKED",
    resourceType: "AgentCredential",
    resourceId: credentialId,
    metadataJson: {
      agentId,
      orgId: agent.organizationId,
    },
  });
  revalidatePath(`/app/agents/${agentId}`);
}

export async function toggleAgentPublicTrustCardAction(formData: FormData) {
  const agentId = String(formData.get("agentId") ?? "");
  const makePublic = String(formData.get("makePublic") ?? "false") === "true";
  if (!agentId) return;
  const { session, tenantId, agent } = await assertAgentManageAccess(agentId);

  const currentTrust = await prisma.trustScore.findFirst({
    where: { tenantId, agentId, isCurrent: true },
    orderBy: { calculatedAt: "desc" },
  });
  const slug = `agent-${agent.slug}`;
  const metadata =
    typeof agent.metadataJson === "object" && agent.metadataJson !== null
      ? (agent.metadataJson as Record<string, unknown>)
      : {};
  const capabilities = Array.isArray(metadata.capabilities)
    ? (metadata.capabilities as string[]).filter((item) => typeof item === "string" && item.trim().length > 0)
    : [];

  await prisma.publicTrustProfile.upsert({
    where: {
      tenantId_agentId: {
        tenantId,
        agentId,
      },
    },
    update: {
      status: makePublic ? "PUBLISHED" : "DRAFT",
      latestScore: currentTrust?.score ?? null,
      latestTier: currentTrust?.tier ?? null,
      publishedByUserId: makePublic ? session.user.id : null,
      publishedAt: makePublic ? new Date() : null,
      headline: agent.displayName,
      summary: agent.description ?? null,
      visibilityJson: {
        displayName: true,
        summary: true,
        verificationBadges: true,
        linkedPublicIdentities: false,
        trustStatus: true,
        organizationAssociation: true,
        publicClaims: true,
      },
      traitsJson: {
        publicClaims: capabilities.slice(0, 8),
      },
    },
    create: {
      tenantId,
      agentId,
      slug,
      status: makePublic ? "PUBLISHED" : "DRAFT",
      headline: agent.displayName,
      summary: agent.description ?? null,
      latestScore: currentTrust?.score ?? null,
      latestTier: currentTrust?.tier ?? null,
      publishedByUserId: makePublic ? session.user.id : null,
      publishedAt: makePublic ? new Date() : null,
      visibilityJson: {
        displayName: true,
        summary: true,
        verificationBadges: true,
        linkedPublicIdentities: false,
        trustStatus: true,
        organizationAssociation: true,
        publicClaims: true,
      },
      traitsJson: {
        publicClaims: capabilities.slice(0, 8),
      },
    },
  });

  await createAuditLog({
    tenantId,
    actorUserId: session.user.id,
    actionType: makePublic ? "AGENT_TRUST_CARD_PUBLISHED" : "AGENT_TRUST_CARD_UNPUBLISHED",
    resourceType: "PublicTrustProfile",
    resourceId: agentId,
    metadataJson: {
      agentId,
      orgId: agent.organizationId,
      makePublic,
      slug,
    },
  });

  revalidatePath(`/app/agents/${agentId}`);
}

export async function openAgentRegistryAction(formData: FormData) {
  const agentId = String(formData.get("agentId") ?? "");
  if (!agentId) return;
  redirect(`/app/agents/${agentId}` as Route);
}
