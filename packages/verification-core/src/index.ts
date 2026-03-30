export type VerificationProviderResult = {
  verified: boolean;
  confidence: number;
  provider: string;
  providerCheckRef: string;
  rawPayload: Record<string, unknown>;
};

export type VerificationProviderAdapter = {
  providerId: string;
  initiateCheck(input: {
    verificationRequestId: string;
    subjectId: string;
    verificationType: string;
  }): Promise<{ providerCheckRef: string }>;
  getCheckStatus(input: {
    providerCheckRef: string;
    verificationType: string;
  }): Promise<VerificationProviderResult>;
  normalizeClaim(input: {
    verificationType: string;
    result: VerificationProviderResult;
  }): {
    claimType: string;
    claimLevel: string;
    valueJson: Record<string, unknown>;
    issuer: string;
  };
};

export class MockVerificationAdapter implements VerificationProviderAdapter {
  providerId = "mock-provider";

  async initiateCheck(input: {
    verificationRequestId: string;
    subjectId: string;
    verificationType: string;
  }): Promise<{ providerCheckRef: string }> {
    return {
      providerCheckRef: `mock-${input.verificationRequestId}`,
    };
  }

  async getCheckStatus(input: {
    providerCheckRef: string;
    verificationType: string;
  }): Promise<VerificationProviderResult> {
    return {
      verified: true,
      confidence: 0.98,
      provider: this.providerId,
      providerCheckRef: input.providerCheckRef,
      rawPayload: {
        verificationType: input.verificationType,
        processedAt: new Date().toISOString(),
        source: "mock-adapter",
      },
    };
  }

  normalizeClaim(input: {
    verificationType: string;
    result: VerificationProviderResult;
  }): {
    claimType: string;
    claimLevel: string;
    valueJson: Record<string, unknown>;
    issuer: string;
  } {
    return {
      claimType: input.verificationType,
      claimLevel: input.result.verified ? "VERIFIED" : "UNVERIFIED",
      valueJson: {
        provider: input.result.provider,
        providerCheckRef: input.result.providerCheckRef,
        confidence: input.result.confidence,
        rawPayload: input.result.rawPayload,
      },
      issuer: input.result.provider,
    };
  }
}

export function getVerificationAdapter(provider: string): VerificationProviderAdapter {
  if (provider === "mock-provider") {
    return new MockVerificationAdapter();
  }
  throw new Error(`Unsupported verification provider: ${provider}`);
}

export * from "./verification-center.js";
