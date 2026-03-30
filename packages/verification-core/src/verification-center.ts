import { createHash } from "node:crypto";

export const verificationCenterModules = [
  "email_verification",
  "human_verification",
  "phone_verification_placeholder",
  "github_identity_verification",
  "organization_domain_verification",
  "ai_agent_registration",
] as const;

export type VerificationCenterModule = (typeof verificationCenterModules)[number];

export type VerificationCenterStatus =
  | "pending"
  | "verified"
  | "failed"
  | "rejected"
  | "needs_review";

export type VerificationCenterExecutionInput = {
  tenantId: string;
  verificationRecordId: string;
  module: VerificationCenterModule;
  subjectRef: string;
  initiatedByUserId: string;
  details?: Record<string, unknown>;
};

export type VerificationCenterExecutionResult = {
  status: VerificationCenterStatus;
  confidenceScore: number;
  externalRef: string;
  evidence: Record<string, unknown>;
  provider: "MOCK" | "INTERNAL" | "CUSTOM";
  verificationType:
    | "IDENTITY"
    | "LIVENESS"
    | "DOMAIN"
    | "ORGANIZATION"
    | "AGENT_ATTESTATION";
};

export type VerificationCenterProviderAdapter = {
  adapterId: string;
  modules: VerificationCenterModule[];
  execute(input: VerificationCenterExecutionInput): Promise<VerificationCenterExecutionResult>;
};

function seededFloat(seed: string, min: number, max: number): number {
  const hash = createHash("sha256").update(seed).digest("hex");
  const bucket = parseInt(hash.slice(0, 8), 16) / 0xffffffff;
  return min + bucket * (max - min);
}

function seededPick<T>(seed: string, weighted: Array<{ value: T; weight: number }>): T {
  const total = weighted.reduce((acc, item) => acc + item.weight, 0);
  const point = seededFloat(seed, 0, total);
  let cursor = 0;
  for (const item of weighted) {
    cursor += item.weight;
    if (point <= cursor) {
      return item.value;
    }
  }
  return weighted[weighted.length - 1].value;
}

class MockVerificationCenterAdapter implements VerificationCenterProviderAdapter {
  adapterId = "mock-verification-center";
  modules = verificationCenterModules.slice();

  async execute(input: VerificationCenterExecutionInput): Promise<VerificationCenterExecutionResult> {
    const seed = `${input.tenantId}:${input.verificationRecordId}:${input.module}:${input.subjectRef}`;
    const status = this.resolveStatus(input.module, seed);
    const confidence = Math.round(seededFloat(seed, 60, 99)) / 100;

    const baseEvidence: Record<string, unknown> = {
      module: input.module,
      adapter: this.adapterId,
      simulatedAt: new Date().toISOString(),
      status,
      details: input.details ?? {},
    };

    switch (input.module) {
      case "email_verification":
        return {
          status,
          confidenceScore: confidence,
          externalRef: `mock-email-${input.verificationRecordId}`,
          evidence: {
            ...baseEvidence,
            providerSignal: "smtp_confirmation",
          },
          provider: "MOCK",
          verificationType: "IDENTITY",
        };
      case "human_verification":
        return {
          status,
          confidenceScore: confidence,
          externalRef: `mock-human-${input.verificationRecordId}`,
          evidence: {
            ...baseEvidence,
            providerSignal: "biometric_liveness",
          },
          provider: "MOCK",
          verificationType: "LIVENESS",
        };
      case "phone_verification_placeholder":
        return {
          status: "pending",
          confidenceScore: 0.5,
          externalRef: `mock-phone-${input.verificationRecordId}`,
          evidence: {
            ...baseEvidence,
            placeholder: true,
            providerSignal: "sms_otp_not_configured",
          },
          provider: "INTERNAL",
          verificationType: "IDENTITY",
        };
      case "github_identity_verification":
        return {
          status,
          confidenceScore: confidence,
          externalRef: `mock-github-${input.verificationRecordId}`,
          evidence: {
            ...baseEvidence,
            providerSignal: "oauth_account_match",
          },
          provider: "MOCK",
          verificationType: "IDENTITY",
        };
      case "organization_domain_verification":
        return {
          status,
          confidenceScore: confidence,
          externalRef: `mock-domain-${input.verificationRecordId}`,
          evidence: {
            ...baseEvidence,
            providerSignal: "dns_txt_challenge",
          },
          provider: "INTERNAL",
          verificationType: "DOMAIN",
        };
      case "ai_agent_registration":
        return {
          status,
          confidenceScore: confidence,
          externalRef: `mock-agent-${input.verificationRecordId}`,
          evidence: {
            ...baseEvidence,
            providerSignal: "policy_attestation",
          },
          provider: "CUSTOM",
          verificationType: "AGENT_ATTESTATION",
        };
    }
  }

  private resolveStatus(module: VerificationCenterModule, seed: string): VerificationCenterStatus {
    if (module === "phone_verification_placeholder") {
      return "pending";
    }

    if (module === "ai_agent_registration") {
      return seededPick(seed, [
        { value: "needs_review", weight: 0.55 },
        { value: "verified", weight: 0.3 },
        { value: "failed", weight: 0.15 },
      ]);
    }

    if (module === "organization_domain_verification") {
      return seededPick(seed, [
        { value: "verified", weight: 0.55 },
        { value: "needs_review", weight: 0.2 },
        { value: "failed", weight: 0.15 },
        { value: "rejected", weight: 0.1 },
      ]);
    }

    return seededPick(seed, [
      { value: "verified", weight: 0.7 },
      { value: "needs_review", weight: 0.12 },
      { value: "failed", weight: 0.1 },
      { value: "rejected", weight: 0.08 },
    ]);
  }
}

export function getVerificationCenterAdapter(_: VerificationCenterModule): VerificationCenterProviderAdapter {
  return new MockVerificationCenterAdapter();
}
