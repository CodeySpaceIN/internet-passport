import { hash } from "bcryptjs";
import { prisma } from "./client.js";
import { daysFromNow, generateRawKey, keyPrefix, sha256 } from "./seed-utils.js";

async function clearTenantDemoData(tenantId: string) {
  await prisma.notification.deleteMany({ where: { tenantId } });
  await prisma.adminFlag.deleteMany({ where: { tenantId } });
  await prisma.auditLog.deleteMany({ where: { tenantId } });
  await prisma.apiRequestLog.deleteMany({ where: { tenantId } });
  await prisma.apiKey.deleteMany({ where: { tenantId } });
  await prisma.appIntegration.deleteMany({ where: { tenantId } });
  await prisma.publicTrustProfile.deleteMany({ where: { tenantId } });
  await prisma.riskSignal.deleteMany({ where: { tenantId } });
  await prisma.trustScore.deleteMany({ where: { tenantId } });
  await prisma.verificationRecord.deleteMany({ where: { tenantId } });
  await prisma.agentCredential.deleteMany({ where: { tenantId } });
  await prisma.agent.deleteMany({ where: { tenantId } });
  await prisma.domainVerification.deleteMany({
    where: { organization: { tenantId } },
  });
  await prisma.organizationMember.deleteMany({
    where: { organization: { tenantId } },
  });
  await prisma.organization.deleteMany({ where: { tenantId } });
  await prisma.identityProviderLink.deleteMany({ where: { tenantId } });
  await prisma.session.deleteMany({ where: { tenantId } });
}

async function main() {
  const passwordHash = await hash("ChangeMe123!", 10);

  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo-tenant" },
    update: { name: "Demo Tenant" },
    create: {
      name: "Demo Tenant",
      slug: "demo-tenant",
    },
  });

  await clearTenantDemoData(tenant.id);

  const demoUsers = [
    { email: "founder@internetpassport.dev", name: "Avery Quinn", role: "OWNER" as const },
    { email: "security@internetpassport.dev", name: "Mina Rao", role: "ADMIN" as const },
    { email: "reviewer@internetpassport.dev", name: "Jon Park", role: "TRUST_REVIEWER" as const },
    { email: "developer@internetpassport.dev", name: "Chris Vega", role: "DEVELOPER" as const },
    { email: "analyst@internetpassport.dev", name: "Nora Hale", role: "ANALYST" as const },
  ];

  const users = await Promise.all(
    demoUsers.map(async (entry) => {
      const user = await prisma.user.upsert({
        where: { email: entry.email },
        update: { name: entry.name, passwordHash, deletedAt: null },
        create: { email: entry.email, name: entry.name, passwordHash },
      });

      await prisma.membership.upsert({
        where: {
          tenantId_userId: {
            tenantId: tenant.id,
            userId: user.id,
          },
        },
        update: { role: entry.role },
        create: {
          tenantId: tenant.id,
          userId: user.id,
          role: entry.role,
        },
      });

      return user;
    }),
  );

  const [founder, securityLead, reviewer, developer, analyst] = users;

  await prisma.session.createMany({
    data: [
      {
        tenantId: tenant.id,
        userId: founder.id,
        tokenHash: sha256("session_founder_demo"),
        ipAddress: "10.10.0.11",
        userAgent: "Mozilla/5.0",
        expiresAt: daysFromNow(14),
      },
      {
        tenantId: tenant.id,
        userId: securityLead.id,
        tokenHash: sha256("session_security_demo"),
        ipAddress: "10.10.0.12",
        userAgent: "Mozilla/5.0",
        expiresAt: daysFromNow(10),
      },
    ],
  });

  await prisma.identityProviderLink.createMany({
    data: [
      {
        tenantId: tenant.id,
        userId: founder.id,
        provider: "GOOGLE",
        providerUserId: "google_avery_001",
        providerEmail: founder.email,
        accessTokenHash: sha256("google-token-founder"),
      },
      {
        tenantId: tenant.id,
        userId: developer.id,
        provider: "GITHUB",
        providerUserId: "gh_chris_002",
        providerEmail: developer.email,
        accessTokenHash: sha256("github-token-dev"),
      },
      {
        tenantId: tenant.id,
        userId: reviewer.id,
        provider: "EMAIL",
        providerUserId: "email_jon_003",
        providerEmail: reviewer.email,
      },
    ],
  });

  const alphaOrg = await prisma.organization.create({
    data: {
      tenantId: tenant.id,
      ownerUserId: founder.id,
      name: "Alpha Marketplace",
      slug: "alpha-marketplace",
      legalName: "Alpha Marketplace Inc.",
      organizationType: "COMPANY",
      websiteUrl: "https://alpha.market",
      metadataJson: { region: "US", vertical: "marketplace" },
    },
  });

  const novaOrg = await prisma.organization.create({
    data: {
      tenantId: tenant.id,
      ownerUserId: securityLead.id,
      name: "Nova Talent Cloud",
      slug: "nova-talent-cloud",
      legalName: "Nova Talent Cloud LLC",
      organizationType: "COMPANY",
      websiteUrl: "https://nova.talent",
      metadataJson: { region: "EU", vertical: "hiring" },
    },
  });

  await prisma.organizationMember.createMany({
    data: [
      { organizationId: alphaOrg.id, userId: founder.id, role: "OWNER" },
      { organizationId: alphaOrg.id, userId: developer.id, role: "DEVELOPER" },
      { organizationId: alphaOrg.id, userId: reviewer.id, role: "REVIEWER" },
      { organizationId: novaOrg.id, userId: securityLead.id, role: "OWNER" },
      { organizationId: novaOrg.id, userId: analyst.id, role: "ANALYST" },
    ],
  });

  await prisma.domainVerification.createMany({
    data: [
      {
        organizationId: alphaOrg.id,
        domain: "alpha.market",
        status: "VERIFIED",
        challengeToken: "ip-verify-alpha-market",
        verifiedAt: new Date(),
        expiresAt: daysFromNow(365),
      },
      {
        organizationId: novaOrg.id,
        domain: "nova.talent",
        status: "PENDING",
        challengeToken: "ip-verify-nova-talent",
        expiresAt: daysFromNow(14),
      },
    ],
  });

  const supportAgent = await prisma.agent.create({
    data: {
      tenantId: tenant.id,
      organizationId: alphaOrg.id,
      managerUserId: founder.id,
      displayName: "Alpha Support Agent",
      slug: "alpha-support-agent",
      description: "Handles authenticated support actions.",
      status: "ACTIVE",
      policyVersion: "v1.2.0",
    },
  });

  const hiringAgent = await prisma.agent.create({
    data: {
      tenantId: tenant.id,
      organizationId: novaOrg.id,
      managerUserId: securityLead.id,
      displayName: "Nova Hiring Agent",
      slug: "nova-hiring-agent",
      description: "Screens candidates and verifies claims.",
      status: "ACTIVE",
      policyVersion: "v1.0.3",
    },
  });

  const triageAgent = await prisma.agent.create({
    data: {
      tenantId: tenant.id,
      managerUserId: reviewer.id,
      displayName: "Global Triage Agent",
      slug: "global-triage-agent",
      description: "Monitors cross-tenant abuse signals.",
      status: "PAUSED",
      policyVersion: "v0.9.1",
    },
  });

  await prisma.agentCredential.createMany({
    data: [
      {
        tenantId: tenant.id,
        agentId: supportAgent.id,
        credentialType: "JWT_SIGNING_KEY",
        keyId: "supp-sign-1",
        keyHash: sha256("supp-signing-key"),
        algorithm: "EdDSA",
        publicMaterial: "did:key:z6Mkg...",
        expiresAt: daysFromNow(180),
      },
      {
        tenantId: tenant.id,
        agentId: hiringAgent.id,
        credentialType: "API_KEY",
        keyId: "hire-api-1",
        keyHash: sha256("hire-agent-key"),
        algorithm: "HS256",
      },
      {
        tenantId: tenant.id,
        agentId: triageAgent.id,
        credentialType: "X509_CERT",
        keyId: "triage-cert-1",
        keyHash: sha256("triage-cert"),
        algorithm: "RS256",
        expiresAt: daysFromNow(90),
      },
    ],
  });

  const legacyHumanSubject =
    (await prisma.subject.findFirst({
      where: { tenantId: tenant.id, subjectType: "HUMAN", displayName: "Demo Verified Human" },
    })) ??
    (await prisma.subject.create({
      data: {
        tenantId: tenant.id,
        subjectType: "HUMAN",
        displayName: "Demo Verified Human",
        status: "ACTIVE",
      },
    }));

  const legacyOrgSubject =
    (await prisma.subject.findFirst({
      where: { tenantId: tenant.id, subjectType: "ORG", displayName: alphaOrg.name },
    })) ??
    (await prisma.subject.create({
      data: {
        tenantId: tenant.id,
        subjectType: "ORG",
        displayName: alphaOrg.name,
        status: "ACTIVE",
      },
    }));

  const reviewCase =
    (await prisma.reviewCase.findFirst({
      where: {
        tenantId: tenant.id,
        subjectId: legacyHumanSubject.id,
        caseType: "MANUAL_REVIEW",
      },
    })) ??
    (await prisma.reviewCase.create({
      data: {
        tenantId: tenant.id,
        subjectId: legacyHumanSubject.id,
        caseType: "MANUAL_REVIEW",
        priority: "HIGH",
        status: "IN_REVIEW",
        openedByUserId: reviewer.id,
      },
    }));

  const verificationRecords = await Promise.all([
    prisma.verificationRecord.create({
      data: {
        tenantId: tenant.id,
        userId: founder.id,
        requestedByUserId: founder.id,
        reviewedByUserId: reviewer.id,
        reviewCaseId: reviewCase.id,
        verificationType: "IDENTITY",
        provider: "SUMSUB",
        state: "PASSED",
        confidenceScore: 0.98,
        evidenceJson: { docType: "passport", country: "US" },
        externalRef: "vr_founder_identity_001",
        completedAt: new Date(),
        expiresAt: daysFromNow(365),
      },
    }),
    prisma.verificationRecord.create({
      data: {
        tenantId: tenant.id,
        userId: developer.id,
        requestedByUserId: securityLead.id,
        verificationType: "LIVENESS",
        provider: "STRIPE_IDENTITY",
        state: "PASSED",
        confidenceScore: 0.92,
        evidenceJson: { liveness: "pass", spoofRisk: "low" },
        externalRef: "vr_dev_liveness_002",
        completedAt: new Date(),
      },
    }),
    prisma.verificationRecord.create({
      data: {
        tenantId: tenant.id,
        organizationId: alphaOrg.id,
        requestedByUserId: founder.id,
        verificationType: "ORGANIZATION",
        provider: "TRULIOO",
        state: "PASSED",
        confidenceScore: 0.95,
        evidenceJson: { registrationMatch: true },
        externalRef: "vr_alpha_org_003",
      },
    }),
    prisma.verificationRecord.create({
      data: {
        tenantId: tenant.id,
        organizationId: novaOrg.id,
        requestedByUserId: securityLead.id,
        verificationType: "DOMAIN",
        provider: "INTERNAL",
        state: "IN_PROGRESS",
        confidenceScore: 0.62,
        evidenceJson: { dnsTxtFound: false },
        externalRef: "vr_nova_domain_004",
      },
    }),
    prisma.verificationRecord.create({
      data: {
        tenantId: tenant.id,
        agentId: supportAgent.id,
        requestedByUserId: founder.id,
        verificationType: "AGENT_ATTESTATION",
        provider: "CUSTOM",
        state: "NEEDS_REVIEW",
        confidenceScore: 0.71,
        evidenceJson: { policyHash: "abc123", sandboxPass: true },
        externalRef: "vr_agent_attest_005",
      },
    }),
  ]);

  await prisma.trustScore.createMany({
    data: [
      {
        tenantId: tenant.id,
        userId: founder.id,
        verificationRecordId: verificationRecords[0].id,
        score: 94,
        tier: "VERIFIED",
        reasonCodes: ["ID_VERIFIED", "LOW_RISK_ACTIVITY"],
      },
      {
        tenantId: tenant.id,
        userId: developer.id,
        verificationRecordId: verificationRecords[1].id,
        score: 82,
        tier: "HIGH",
        reasonCodes: ["LIVENESS_VERIFIED", "GOOD_CONTRIBUTION_HISTORY"],
      },
      {
        tenantId: tenant.id,
        organizationId: alphaOrg.id,
        verificationRecordId: verificationRecords[2].id,
        score: 89,
        tier: "HIGH",
        reasonCodes: ["ORG_VERIFIED", "DOMAIN_VERIFIED"],
      },
      {
        tenantId: tenant.id,
        organizationId: novaOrg.id,
        verificationRecordId: verificationRecords[3].id,
        score: 61,
        tier: "MEDIUM",
        reasonCodes: ["DOMAIN_PENDING"],
      },
      {
        tenantId: tenant.id,
        agentId: supportAgent.id,
        verificationRecordId: verificationRecords[4].id,
        score: 67,
        tier: "MEDIUM",
        reasonCodes: ["ATTESTATION_REVIEW_REQUIRED"],
      },
    ],
  });

  await prisma.riskSignal.createMany({
    data: [
      {
        tenantId: tenant.id,
        userId: developer.id,
        verificationRecordId: verificationRecords[1].id,
        signalType: "VELOCITY_ANOMALY",
        severity: "MEDIUM",
        scoreDelta: -12,
        evidenceJson: { attemptsLastHour: 18, baseline: 5 },
      },
      {
        tenantId: tenant.id,
        organizationId: novaOrg.id,
        verificationRecordId: verificationRecords[3].id,
        signalType: "DOMAIN_SPOOFING",
        severity: "HIGH",
        scoreDelta: -24,
        evidenceJson: { lookalikeDomain: "n0va.talent" },
      },
      {
        tenantId: tenant.id,
        agentId: triageAgent.id,
        signalType: "BOT_BEHAVIOR",
        severity: "LOW",
        scoreDelta: -5,
        evidenceJson: { actionBurst: false },
      },
      {
        tenantId: tenant.id,
        userId: analyst.id,
        signalType: "IP_REPUTATION_BAD",
        severity: "MEDIUM",
        scoreDelta: -10,
        evidenceJson: { ip: "198.51.100.24" },
      },
    ],
  });

  await prisma.publicTrustProfile.createMany({
    data: [
      {
        tenantId: tenant.id,
        userId: founder.id,
        slug: "avery-quinn",
        status: "PUBLISHED",
        headline: "Verified trust operator",
        summary: "Identity and organization controls verified.",
        latestScore: 94,
        latestTier: "VERIFIED",
        traitsJson: { specialties: ["compliance", "governance"] },
        publishedByUserId: founder.id,
        publishedAt: new Date(),
      },
      {
        tenantId: tenant.id,
        organizationId: alphaOrg.id,
        slug: "alpha-marketplace",
        status: "PUBLISHED",
        headline: "Trusted marketplace operator",
        summary: "Organization and domain verified.",
        latestScore: 89,
        latestTier: "HIGH",
        publishedByUserId: founder.id,
        publishedAt: new Date(),
      },
      {
        tenantId: tenant.id,
        agentId: supportAgent.id,
        slug: "alpha-support-agent",
        status: "PUBLISHED",
        headline: "Verified support AI agent",
        summary: "Agent attestation in managed review.",
        latestScore: 67,
        latestTier: "MEDIUM",
        publishedByUserId: reviewer.id,
        publishedAt: new Date(),
      },
    ],
  });

  const slackIntegration = await prisma.appIntegration.create({
    data: {
      tenantId: tenant.id,
      organizationId: alphaOrg.id,
      createdByUserId: founder.id,
      type: "SLACK",
      providerAccountId: "T-ALPHA-123",
      name: "Alpha Slack Alerts",
      status: "ACTIVE",
      configJson: { channel: "#trust-alerts", webhookPath: "/slack/events" },
      secretHash: sha256("slack-signing-secret"),
    },
  });

  const githubIntegration = await prisma.appIntegration.create({
    data: {
      tenantId: tenant.id,
      organizationId: novaOrg.id,
      createdByUserId: securityLead.id,
      type: "GITHUB",
      providerAccountId: "org_nova_talent",
      name: "Nova GitHub Verification",
      status: "ACTIVE",
      configJson: { installationId: 99331, repos: ["nova/api", "nova/app"] },
      secretHash: sha256("github-app-secret"),
    },
  });

  const supportRawKey = generateRawKey("ip_live");
  const orgRawKey = generateRawKey("ip_live");
  const agentRawKey = generateRawKey("ip_live");

  const supportApiKey = await prisma.apiKey.create({
    data: {
      tenantId: tenant.id,
      userId: founder.id,
      integrationId: slackIntegration.id,
      name: "Founder CLI Key",
      keyPrefix: keyPrefix(supportRawKey),
      keyHash: sha256(supportRawKey),
      scopes: ["subjects:read", "trust:read", "actions:sign"],
      status: "ACTIVE",
      expiresAt: daysFromNow(180),
    },
  });

  const orgApiKey = await prisma.apiKey.create({
    data: {
      tenantId: tenant.id,
      organizationId: alphaOrg.id,
      integrationId: githubIntegration.id,
      name: "Alpha Server Key",
      keyPrefix: keyPrefix(orgRawKey),
      keyHash: sha256(orgRawKey),
      scopes: ["verifications:write", "trust:evaluate", "webhooks:write"],
      status: "ACTIVE",
      expiresAt: daysFromNow(90),
    },
  });

  const agentApiKey = await prisma.apiKey.create({
    data: {
      tenantId: tenant.id,
      agentId: supportAgent.id,
      name: "Support Agent Key",
      keyPrefix: keyPrefix(agentRawKey),
      keyHash: sha256(agentRawKey),
      scopes: ["actions:sign", "actions:verify", "audit:read"],
      status: "ACTIVE",
      expiresAt: daysFromNow(45),
    },
  });

  await prisma.apiRequestLog.createMany({
    data: [
      {
        tenantId: tenant.id,
        apiKeyId: supportApiKey.id,
        userId: founder.id,
        method: "POST",
        path: "/v1/actions/sign",
        statusCode: 200,
        outcome: "SUCCESS",
        latencyMs: 84,
        requestId: "req_demo_001",
      },
      {
        tenantId: tenant.id,
        apiKeyId: orgApiKey.id,
        organizationId: alphaOrg.id,
        method: "POST",
        path: "/v1/verifications",
        statusCode: 202,
        outcome: "SUCCESS",
        latencyMs: 112,
        requestId: "req_demo_002",
      },
      {
        tenantId: tenant.id,
        apiKeyId: agentApiKey.id,
        agentId: supportAgent.id,
        method: "POST",
        path: "/v1/actions/verify",
        statusCode: 200,
        outcome: "SUCCESS",
        latencyMs: 65,
        requestId: "req_demo_003",
      },
      {
        tenantId: tenant.id,
        userId: analyst.id,
        method: "GET",
        path: "/v1/audit/events",
        statusCode: 429,
        outcome: "RATE_LIMITED",
        latencyMs: 18,
        requestId: "req_demo_004",
      },
    ],
  });

  const demoActionHash = sha256("approve_vendor:alpha-marketplace");
  await prisma.signedAction.create({
    data: {
      tenantId: tenant.id,
      subjectId: legacyOrgSubject.id,
      actorAgentId: supportAgent.id,
      actionType: "approve_vendor",
      resourceType: "vendor_profile",
      resourceId: "vendor_001",
      contextType: "marketplace_onboarding",
      payloadHash: demoActionHash,
      nonce: "nonce_demo_phase3_001",
      signature: sha256(`${demoActionHash}:nonce_demo_phase3_001`),
      expiresAt: daysFromNow(7),
      verificationStatus: "VERIFIED",
      verifiedAt: new Date(),
    },
  });

  await prisma.auditLog.createMany({
    data: [
      {
        tenantId: tenant.id,
        actorUserId: founder.id,
        actorApiKeyId: supportApiKey.id,
        actionType: "CREATE_VERIFICATION",
        resourceType: "VerificationRecord",
        resourceId: verificationRecords[0].id,
        requestId: "req_demo_001",
        outcome: "SUCCESS",
      },
      {
        tenantId: tenant.id,
        actorUserId: reviewer.id,
        actionType: "REVIEW_CASE_UPDATE",
        resourceType: "ReviewCase",
        resourceId: reviewCase.id,
        requestId: "req_demo_005",
        outcome: "SUCCESS",
      },
      {
        tenantId: tenant.id,
        actorAgentId: supportAgent.id,
        actorApiKeyId: agentApiKey.id,
        actionType: "SIGNED_ACTION_VERIFY",
        resourceType: "SignedAction",
        outcome: "SUCCESS",
      },
    ],
  });

  await prisma.adminFlag.createMany({
    data: [
      {
        tenantId: tenant.id,
        organizationId: novaOrg.id,
        reviewCaseId: reviewCase.id,
        raisedByUserId: securityLead.id,
        reasonCode: "DOMAIN_LOOKALIKE",
        description: "Potential brand spoofing around onboarding emails.",
        severity: "HIGH",
        status: "IN_REVIEW",
      },
      {
        tenantId: tenant.id,
        agentId: triageAgent.id,
        raisedByUserId: reviewer.id,
        reasonCode: "MODEL_BEHAVIOR_DRIFT",
        severity: "MEDIUM",
        status: "OPEN",
      },
    ],
  });

  await prisma.notification.createMany({
    data: [
      {
        tenantId: tenant.id,
        recipientUserId: reviewer.id,
        reviewCaseId: reviewCase.id,
        verificationRecordId: verificationRecords[4].id,
        type: "REVIEW_ASSIGNED",
        title: "Agent attestation needs review",
        body: "Global Triage Agent attestation is pending your review.",
      },
      {
        tenantId: tenant.id,
        recipientUserId: founder.id,
        verificationRecordId: verificationRecords[0].id,
        type: "VERIFICATION_UPDATED",
        status: "READ",
        title: "Identity verification passed",
        body: "Your identity verification is completed successfully.",
        readAt: new Date(),
      },
      {
        tenantId: tenant.id,
        recipientUserId: securityLead.id,
        type: "SECURITY_ALERT",
        title: "High-risk domain signal detected",
        body: "Nova Talent Cloud has a high-risk domain spoofing signal.",
      },
    ],
  });

  const existingPolicy = await prisma.policy.findFirst({
    where: {
      tenantId: tenant.id,
      contextType: "default_action",
      isActive: true,
    },
    orderBy: { version: "desc" },
  });

  if (!existingPolicy) {
    await prisma.policy.create({
      data: {
        tenantId: tenant.id,
        name: "Default Trust Policy",
        contextType: "default_action",
        version: 1,
        isActive: true,
        definition: {
          allowThreshold: 80,
          stepUpThreshold: 60,
          reviewThreshold: 40,
        },
      },
    });
  }

  console.log("Seed completed successfully.");
  console.log("Demo API keys (store securely, shown once during seed):");
  console.log(`- Founder CLI: ${supportRawKey}`);
  console.log(`- Alpha Server: ${orgRawKey}`);
  console.log(`- Support Agent: ${agentRawKey}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
