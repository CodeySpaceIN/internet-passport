import { createHash } from "node:crypto";
import {
  defaultTrustEngineConfig,
  mergeTrustEngineConfig,
  type TrustEngineConfig,
  type TrustEngineConfigOverride,
} from "./rules-config";

export type TrustScoringInputs = {
  emailVerified: boolean;
  githubLinked: boolean;
  humanVerified: boolean;
  phoneVerified: boolean;
  organizationVerified: boolean;
  suspiciousActivityFlags: number;
  repeatedFailedVerificationAttempts: number;
  accountAgeDays: number;
  adminReviewOpen: boolean;
  linkedTrustedIdentities: number;
  negativeEventsOrSuspensions: number;
};

export type TrustFactorExplanation = {
  key: keyof TrustScoringInputs;
  impact: number;
  explanation: string;
};

export type TrustScoringResult = {
  score: number;
  riskTier: "low" | "medium" | "high";
  factors: TrustFactorExplanation[];
  configVersion: string;
  featuresHash: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function buildRiskTier(score: number, config: TrustEngineConfig): "low" | "medium" | "high" {
  if (score >= config.thresholds.lowRiskMinScore) return "low";
  if (score >= config.thresholds.mediumRiskMinScore) return "medium";
  return "high";
}

function normalizeAgeDays(days: number): number {
  if (days <= 0) return 0;
  if (days >= 365) return 1;
  return days / 365;
}

function normalizeCount(count: number, cap: number): number {
  if (count <= 0) return 0;
  return Math.min(1, count / cap);
}

export function scoreTrust(
  inputs: TrustScoringInputs,
  configOverride?: TrustEngineConfigOverride,
): TrustScoringResult {
  const config = mergeTrustEngineConfig(configOverride);
  const factors: TrustFactorExplanation[] = [];
  let score = 50;

  const addFactor = (key: keyof TrustScoringInputs, impact: number, explanation: string) => {
    if (impact === 0) return;
    factors.push({ key, impact, explanation });
    score += impact;
  };

  addFactor(
    "emailVerified",
    inputs.emailVerified ? config.weights.emailVerified : 0,
    inputs.emailVerified ? "Email verification completed." : "",
  );

  addFactor(
    "githubLinked",
    inputs.githubLinked ? config.weights.githubLinked : 0,
    inputs.githubLinked ? "GitHub identity linked." : "",
  );

  addFactor(
    "humanVerified",
    inputs.humanVerified ? config.weights.humanVerified : 0,
    inputs.humanVerified ? "Human/liveness verification completed." : "",
  );

  addFactor(
    "phoneVerified",
    inputs.phoneVerified ? config.weights.phoneVerified : 0,
    inputs.phoneVerified ? "Phone verification completed." : "",
  );

  addFactor(
    "organizationVerified",
    inputs.organizationVerified ? config.weights.organizationVerified : 0,
    inputs.organizationVerified ? "Organization/domain verification completed." : "",
  );

  const suspiciousPenalty =
    config.weights.suspiciousActivityFlags * normalizeCount(inputs.suspiciousActivityFlags, 5);
  addFactor(
    "suspiciousActivityFlags",
    suspiciousPenalty,
    inputs.suspiciousActivityFlags > 0
      ? `${inputs.suspiciousActivityFlags} active suspicious activity flags detected.`
      : "",
  );

  const failedPenalty =
    config.weights.repeatedFailedVerificationAttempts *
    normalizeCount(inputs.repeatedFailedVerificationAttempts, 5);
  addFactor(
    "repeatedFailedVerificationAttempts",
    failedPenalty,
    inputs.repeatedFailedVerificationAttempts > 0
      ? `${inputs.repeatedFailedVerificationAttempts} repeated failed verification attempts.`
      : "",
  );

  const ageBoost = config.weights.accountAgeDays * normalizeAgeDays(inputs.accountAgeDays);
  addFactor(
    "accountAgeDays",
    ageBoost,
    inputs.accountAgeDays > 0 ? `Account age contributes ${inputs.accountAgeDays} day(s) of trust history.` : "",
  );

  addFactor(
    "adminReviewOpen",
    inputs.adminReviewOpen ? config.weights.adminReviewOpen : 0,
    inputs.adminReviewOpen ? "Open admin review or escalation exists." : "",
  );

  const identityBoost = config.weights.linkedTrustedIdentities * normalizeCount(inputs.linkedTrustedIdentities, 4);
  addFactor(
    "linkedTrustedIdentities",
    identityBoost,
    inputs.linkedTrustedIdentities > 0
      ? `${inputs.linkedTrustedIdentities} trusted linked identit${inputs.linkedTrustedIdentities === 1 ? "y" : "ies"} detected.`
      : "",
  );

  const negativePenalty =
    config.weights.negativeEventsOrSuspensions * normalizeCount(inputs.negativeEventsOrSuspensions, 4);
  addFactor(
    "negativeEventsOrSuspensions",
    negativePenalty,
    inputs.negativeEventsOrSuspensions > 0
      ? `${inputs.negativeEventsOrSuspensions} negative event(s) or suspension signal(s) found.`
      : "",
  );

  score = clamp(Math.round(score), config.thresholds.minScore, config.thresholds.maxScore);

  const featuresHash = createHash("sha256")
    .update(
      JSON.stringify({
        inputs,
        configVersion: config.version,
        weights: config.weights,
        thresholds: config.thresholds,
      }),
    )
    .digest("hex");

  return {
    score,
    riskTier: buildRiskTier(score, config),
    factors,
    configVersion: config.version,
    featuresHash,
  };
}

export { defaultTrustEngineConfig };
