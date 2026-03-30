#!/usr/bin/env node

const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:4000";
const loginEmail = process.env.SMOKE_EMAIL ?? "founder@internetpassport.dev";
const loginPassword = process.env.SMOKE_PASSWORD ?? "ChangeMe123!";
const pollAttempts = Number(process.env.SMOKE_POLL_ATTEMPTS ?? 12);
const pollDelayMs = Number(process.env.SMOKE_POLL_DELAY_MS ?? 1000);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  console.log(`Smoke test starting against ${apiBaseUrl}`);

  const loginPayload = await request("/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: loginEmail,
      password: loginPassword,
    }),
  });
  const token = loginPayload.accessToken;
  if (!token) {
    throw new Error("Login succeeded but no accessToken was returned.");
  }
  console.log("1) Login passed.");

  const subjectPayload = await request("/v1/subjects", {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    body: JSON.stringify({
      subjectType: "HUMAN",
      displayName: `Smoke Subject ${new Date().toISOString()}`,
    }),
  });
  const subjectId = subjectPayload.id;
  if (!subjectId) {
    throw new Error("Subject creation did not return an id.");
  }
  console.log(`2) Subject created: ${subjectId}`);

  const verificationPayload = await request("/v1/verifications", {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    body: JSON.stringify({
      subjectId,
      verificationType: "human_liveness",
      provider: "mock-provider",
    }),
  });
  const verificationId = verificationPayload.id;
  if (!verificationId) {
    throw new Error("Verification creation did not return an id.");
  }
  console.log(`3) Verification queued: ${verificationId}`);

  let finalStatus = "UNKNOWN";
  for (let attempt = 1; attempt <= pollAttempts; attempt += 1) {
    const current = await request(`/v1/verifications/${verificationId}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    finalStatus = current.status;
    console.log(`   poll ${attempt}/${pollAttempts}: status=${current.status}`);

    if (current.status === "APPROVED") {
      const claimCount = Array.isArray(current.claims) ? current.claims.length : 0;
      console.log(`4) Verification approved with ${claimCount} claim(s).`);
      console.log("Smoke test passed.");
      return;
    }
    if (current.status === "FAILED" || current.status === "REJECTED" || current.status === "CANCELED") {
      throw new Error(`Verification ended in terminal status: ${current.status}`);
    }

    await sleep(pollDelayMs);
  }

  throw new Error(
    `Verification did not reach APPROVED within ${pollAttempts} attempts. Last status=${finalStatus}`,
  );
}

main().catch((error) => {
  console.error("Smoke test failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
