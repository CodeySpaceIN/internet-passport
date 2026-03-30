export type TrustRuleWeights = {
  emailVerified: number;
  githubLinked: number;
  humanVerified: number;
  phoneVerified: number;
  organizationVerified: number;
  suspiciousActivityFlags: number;
  repeatedFailedVerificationAttempts: number;
  accountAgeDays: number;
  adminReviewOpen: number;
  linkedTrustedIdentities: number;
  negativeEventsOrSuspensions: number;
};

export type TrustRuleThresholds = {
  lowRiskMinScore: number;
  mediumRiskMinScore: number;
  highRiskMinScore: number;
  maxScore: number;
  minScore: number;
};

export type TrustEngineConfig = {
  version: string;
  weights: TrustRuleWeights;
  thresholds: TrustRuleThresholds;
};

export type TrustEngineConfigOverride = {
  version?: string;
  weights?: Partial<TrustRuleWeights>;
  thresholds?: Partial<TrustRuleThresholds>;
};

export const defaultTrustEngineConfig: TrustEngineConfig = {
  version: "v2.0.0",
  weights: {
    emailVerified: 10,
    githubLinked: 8,
    humanVerified: 18,
    phoneVerified: 6,
    organizationVerified: 16,
    suspiciousActivityFlags: -14,
    repeatedFailedVerificationAttempts: -12,
    accountAgeDays: 10,
    adminReviewOpen: -10,
    linkedTrustedIdentities: 8,
    negativeEventsOrSuspensions: -20,
  },
  thresholds: {
    lowRiskMinScore: 75,
    mediumRiskMinScore: 45,
    highRiskMinScore: 0,
    maxScore: 100,
    minScore: 0,
  },
};

export function mergeTrustEngineConfig(
  overrides?: TrustEngineConfigOverride,
): TrustEngineConfig {
  return {
    version: overrides?.version ?? defaultTrustEngineConfig.version,
    weights: {
      ...defaultTrustEngineConfig.weights,
      ...(overrides?.weights ?? {}),
    },
    thresholds: {
      ...defaultTrustEngineConfig.thresholds,
      ...(overrides?.thresholds ?? {}),
    },
  };
}
