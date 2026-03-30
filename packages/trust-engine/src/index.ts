import { createHash } from "node:crypto";
export * from "./rules-config";
export * from "./scoring-engine";
export * from "./recalculation";

export type TrustPolicyDefinition = {
  allowThreshold: number;
  stepUpThreshold: number;
  reviewThreshold: number;
};

export type TrustEvaluationInput = {
  subjectStatus: "ACTIVE" | "REVIEW" | "SUSPENDED";
  verificationClaimsCount: number;
  hasRecentVerification: boolean;
  contextType: string;
  actionType: string;
  policyDefinition?: Partial<TrustPolicyDefinition>;
};

export type TrustEvaluationResult = {
  score: number;
  tier: "LOW" | "MEDIUM" | "HIGH";
  decision: "ALLOW" | "STEP_UP" | "REVIEW" | "DENY";
  reasonCodes: string[];
  featuresHash: string;
  normalizedPolicy: TrustPolicyDefinition;
};

const defaultPolicy: TrustPolicyDefinition = {
  allowThreshold: 80,
  stepUpThreshold: 60,
  reviewThreshold: 40,
};

export function evaluateTrust(input: TrustEvaluationInput): TrustEvaluationResult {
  const reasonCodes: string[] = [];
  let score = 0;

  if (input.subjectStatus === "ACTIVE") {
    score += 30;
    reasonCodes.push("SUBJECT_ACTIVE");
  } else if (input.subjectStatus === "REVIEW") {
    score += 10;
    reasonCodes.push("SUBJECT_UNDER_REVIEW");
  } else {
    score -= 30;
    reasonCodes.push("SUBJECT_SUSPENDED");
  }

  if (input.verificationClaimsCount > 0) {
    const claimScore = Math.min(40, input.verificationClaimsCount * 10);
    score += claimScore;
    reasonCodes.push("HAS_VERIFICATION_CLAIMS");
  } else {
    reasonCodes.push("NO_VERIFICATION_CLAIMS");
  }

  if (input.hasRecentVerification) {
    score += 20;
    reasonCodes.push("RECENT_VERIFICATION");
  } else {
    reasonCodes.push("NO_RECENT_VERIFICATION");
  }

  score = Math.max(0, Math.min(100, score));

  const tier: TrustEvaluationResult["tier"] =
    score >= 80 ? "HIGH" : score >= 50 ? "MEDIUM" : "LOW";

  const normalizedPolicy = {
    ...defaultPolicy,
    ...(input.policyDefinition ?? {}),
  };

  let decision: TrustEvaluationResult["decision"] = "DENY";
  if (score >= normalizedPolicy.allowThreshold) {
    decision = "ALLOW";
    reasonCodes.push("POLICY_ALLOW_THRESHOLD_MET");
  } else if (score >= normalizedPolicy.stepUpThreshold) {
    decision = "STEP_UP";
    reasonCodes.push("POLICY_STEP_UP_THRESHOLD_MET");
  } else if (score >= normalizedPolicy.reviewThreshold) {
    decision = "REVIEW";
    reasonCodes.push("POLICY_REVIEW_THRESHOLD_MET");
  } else {
    decision = "DENY";
    reasonCodes.push("POLICY_DENY_THRESHOLD");
  }

  const featuresHash = createHash("sha256")
    .update(
      JSON.stringify({
        subjectStatus: input.subjectStatus,
        verificationClaimsCount: input.verificationClaimsCount,
        hasRecentVerification: input.hasRecentVerification,
        contextType: input.contextType,
        actionType: input.actionType,
        normalizedPolicy,
      }),
    )
    .digest("hex");

  return { score, tier, decision, reasonCodes, featuresHash, normalizedPolicy };
}
