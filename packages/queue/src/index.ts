export const VERIFICATION_QUEUE_NAME = "verification-jobs";
export const WEBHOOK_QUEUE_NAME = "webhook-delivery-jobs";

export type VerificationJobPayload = {
  verificationRequestId: string;
  verificationCheckId: string;
  tenantId: string;
  subjectId: string;
  verificationType: string;
};

export type WebhookDeliveryJobPayload = {
  deliveryId: string;
};

export function getQueueConnection() {
  return {
    url: process.env.REDIS_URL ?? "redis://localhost:6379",
  };
}
