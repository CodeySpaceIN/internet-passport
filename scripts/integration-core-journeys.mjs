#!/usr/bin/env node

const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:4000";
const pollAttempts = Number(process.env.CORE_TEST_POLL_ATTEMPTS ?? 12);
const pollDelayMs = Number(process.env.CORE_TEST_POLL_DELAY_MS ?? 1000);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function request(path, init = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(
      `Request failed ${init.method ?? "GET"} ${path} (${response.status}): ${JSON.stringify(payload)}`,
    );
  }

  return payload;
}

async function main() {
  const now = Date.now();
  const tenantSlug = `launch-${now}`;
  const email = `launch-${now}@internetpassport.dev`;
  const password = "LaunchCandidate123!";

  console.log(`Running core journeys against ${apiBaseUrl}`);

  // 1) New user onboarding via tenant-user bootstrap
  const bootstrap = await request("/v1/bootstrap/tenant-user", {
    method: "POST",
    body: JSON.stringify({
      tenantName: `Launch Tenant ${now}`,
      tenantSlug,
      userName: "Launch User",
      email,
      password,
    }),
  });
  assert(bootstrap?.tenantId, "Bootstrap must return tenantId.");
  assert(bootstrap?.userId, "Bootstrap must return userId.");
  console.log("1) New user onboarding: passed");

  // 2) Login and auth token
  const login = await request("/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, tenantSlug }),
  });
  const token = login?.accessToken;
  assert(token, "Login must return accessToken.");

  // 3) Verification flow subject
  const subject = await request("/v1/subjects", {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    body: JSON.stringify({
      subjectType: "HUMAN",
      displayName: `Journey User ${now}`,
    }),
  });
  assert(subject?.id, "Subject create must return id.");

  const verification = await request("/v1/verifications", {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    body: JSON.stringify({
      subjectId: subject.id,
      verificationType: "human_liveness",
      provider: "mock-provider",
    }),
  });
  assert(verification?.id, "Verification create must return id.");

  let verificationStatus = verification.status ?? "PENDING";
  for (let attempt = 1; attempt <= pollAttempts; attempt += 1) {
    const current = await request(`/v1/verifications/${verification.id}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    verificationStatus = current.status;
    if (["APPROVED", "FAILED", "REJECTED", "CANCELED"].includes(verificationStatus)) {
      break;
    }
    await sleep(pollDelayMs);
  }
  console.log(`2) Verification flow: ${verificationStatus}`);

  // 4) Organization creation
  const organizationEnvelope = await request("/v1/organizations", {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: `Launch Organization ${now}`,
      websiteUrl: "https://example.org",
    }),
  });
  const organization = organizationEnvelope?.data ?? organizationEnvelope;
  assert(organization?.id, "Organization create must return id.");
  console.log("3) Organization creation: passed");

  // 5) Domain verification
  const domainChallengeEnvelope = await request(
    `/v1/organizations/${organization.id}/domains/challenges`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({
        domain: `launch-${now}.example.org`,
      }),
    },
  );
  const domainChallenge = domainChallengeEnvelope?.data ?? domainChallengeEnvelope;
  assert(domainChallenge?.id, "Domain challenge create must return id.");

  const domainVerifyEnvelope = await request(
    `/v1/organizations/${organization.id}/domains/${domainChallenge.id}/verify`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    },
  );
  const domainVerified = domainVerifyEnvelope?.data ?? domainVerifyEnvelope;
  assert(domainVerified?.status === "VERIFIED", "Domain verify must set VERIFIED status.");
  console.log("4) Domain verification: passed");

  // 6) Agent creation
  const agentEnvelope = await request(`/v1/organizations/${organization.id}/agents`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    body: JSON.stringify({
      displayName: `Launch Agent ${now}`,
      handle: `launch-agent-${now}`,
      capabilities: ["trust-check", "risk-triage"],
    }),
  });
  const agent = agentEnvelope?.data ?? agentEnvelope;
  assert(agent?.id, "Agent create must return id.");
  console.log("5) Agent creation: passed");

  // 7) API key generation
  const apiKeyEnvelope = await request("/v1/developer/api-keys", {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: "Launch core journey key",
      scopes: ["trust:read", "trust:check", "actions:verify"],
      organizationId: organization.id,
    }),
  });
  const apiKeySecret = apiKeyEnvelope?.data?.secret;
  assert(apiKeySecret, "Developer API key create must return one-time secret.");
  console.log("6) API key generation: passed");

  // 8) Trust-check API request
  const trustCheckEnvelope = await request("/v1/developer/trust-check", {
    method: "POST",
    headers: { "x-api-key": apiKeySecret },
    body: JSON.stringify({
      targetType: "organization",
      targetId: organization.id,
      contextType: "core_journey_test",
      actionType: "preflight",
    }),
  });
  assert(trustCheckEnvelope?.success === true, "Trust-check must return success envelope.");
  console.log("7) Trust-check API request: passed");

  // 9) Admin review action (create + assign + decision)
  const reviewCase = await request("/v1/reviews/cases", {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    body: JSON.stringify({
      subjectId: subject.id,
      caseType: "core_journey_review",
      priority: "MEDIUM",
    }),
  });
  assert(reviewCase?.id, "Review case create must return id.");

  const initialTask = Array.isArray(reviewCase.tasks) ? reviewCase.tasks[0] : null;
  assert(initialTask?.id, "Review case must include initial task.");

  await request(`/v1/reviews/cases/${reviewCase.id}/assign`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    body: JSON.stringify({
      reviewTaskId: initialTask.id,
      assignedToUserId: login.userId,
    }),
  });

  const reviewDecision = await request(`/v1/reviews/cases/${reviewCase.id}/decision`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    body: JSON.stringify({
      decision: "APPROVE",
      rationale: "Core journey integration test approval",
    }),
  });
  assert(reviewDecision?.id, "Review decision must return id.");
  console.log("8) Admin review action: passed");

  console.log("Core journeys completed successfully.");
}

main().catch((error) => {
  console.error("Core journeys failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
