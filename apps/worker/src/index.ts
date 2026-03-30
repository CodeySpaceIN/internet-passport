import "dotenv/config";
import { Queue, Worker } from "bullmq";
import { createHash } from "node:crypto";
import { prisma } from "@internet-passport/db";
import { getApiEnv } from "@internet-passport/config";
import { createLogger } from "@internet-passport/core";
import { getVerificationAdapter } from "@internet-passport/verification-core";
import {
  getQueueConnection,
  VERIFICATION_QUEUE_NAME,
  WEBHOOK_QUEUE_NAME,
  type VerificationJobPayload,
  type WebhookDeliveryJobPayload,
} from "@internet-passport/queue";

const workerEnv = getApiEnv();
const workerLogger = createLogger("worker");
const connection = getQueueConnection();

export const verificationQueue = new Queue<VerificationJobPayload>(VERIFICATION_QUEUE_NAME, {
  connection,
});
export const webhookQueue = new Queue<WebhookDeliveryJobPayload>(WEBHOOK_QUEUE_NAME, {
  connection,
});

const worker = new Worker(
  VERIFICATION_QUEUE_NAME,
  async (job) => {
    const payload = job.data;
    workerLogger.info("processing verification job", { jobId: job.id, payload });

    const verificationRequest = await prisma.verificationRequest.findUnique({
      where: { id: payload.verificationRequestId },
      include: {
        checks: true,
      },
    });

    if (!verificationRequest) {
      throw new Error(`Verification request ${payload.verificationRequestId} not found.`);
    }

    const check = verificationRequest.checks[0];
    if (!check) {
      throw new Error(`Verification check missing for request ${verificationRequest.id}`);
    }

    await prisma.$transaction(async (tx) => {
      await tx.verificationRequest.update({
        where: { id: verificationRequest.id },
        data: {
          status: "IN_PROGRESS",
        },
      });

      await tx.verificationCheck.update({
        where: { id: check.id },
        data: {
          status: "IN_PROGRESS",
          startedAt: new Date(),
        },
      });

    });

    const adapter = getVerificationAdapter(check.provider);
    const init = await adapter.initiateCheck({
      verificationRequestId: verificationRequest.id,
      subjectId: payload.subjectId,
      verificationType: payload.verificationType,
    });
    const providerResult = await adapter.getCheckStatus({
      providerCheckRef: init.providerCheckRef,
      verificationType: payload.verificationType,
    });
    const normalizedClaim = adapter.normalizeClaim({
      verificationType: payload.verificationType,
      result: providerResult,
    });

    const rawResultHash = createHash("sha256")
      .update(JSON.stringify(providerResult.rawPayload))
      .digest("hex");
    const signature = createHash("sha256")
      .update(`${verificationRequest.id}:${payload.subjectId}:${rawResultHash}`)
      .digest("hex");

    await prisma.$transaction(async (tx) => {
      await tx.verificationCheck.update({
        where: { id: check.id },
        data: {
          status: "COMPLETED",
          rawResultHash,
          completedAt: new Date(),
          providerCheckRef: providerResult.providerCheckRef,
        },
      });

      await tx.verificationClaim.create({
        data: {
          subjectId: payload.subjectId,
          verificationRequestId: verificationRequest.id,
          claimType: normalizedClaim.claimType,
          claimLevel: normalizedClaim.claimLevel,
          valueJson: normalizedClaim.valueJson as any,
          issuer: normalizedClaim.issuer,
          signature,
        },
      });

      await tx.verificationRequest.update({
        where: { id: verificationRequest.id },
        data: {
          status: "APPROVED",
          completedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: payload.tenantId,
          actionType: "VERIFICATION_COMPLETED",
          resourceType: "VerificationRequest",
          resourceId: verificationRequest.id,
          outcome: providerResult.verified ? "SUCCESS" : "FAILURE",
          metadataJson: {
            verificationType: payload.verificationType,
            provider: providerResult.provider,
            providerCheckRef: providerResult.providerCheckRef,
          } as any,
        },
      });

      const signedPayloadHash = createHash("sha256")
        .update(
          JSON.stringify({
            verificationRequestId: verificationRequest.id,
            provider: providerResult.provider,
            verified: providerResult.verified,
          }),
        )
        .digest("hex");
      const nonce = createHash("sha256")
        .update(`${verificationRequest.id}:${Date.now()}`)
        .digest("hex")
        .slice(0, 32);
      const signedSignature = createHash("sha256")
        .update(`placeholder:${signedPayloadHash}:${nonce}`)
        .digest("hex");

      await tx.signedAction.create({
        data: {
          tenantId: payload.tenantId,
          subjectId: payload.subjectId,
          contextType: "verification_worker",
          actionType: "VERIFICATION_COMPLETED",
          resourceType: "VerificationRequest",
          resourceId: verificationRequest.id,
          payloadHash: signedPayloadHash,
          nonce,
          signature: signedSignature,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
          verificationStatus: "PENDING",
        },
      });
    });

    return { processedAt: new Date().toISOString(), verificationRequestId: verificationRequest.id };
  },
  { connection },
);

const webhookWorker = new Worker(
  WEBHOOK_QUEUE_NAME,
  async (job) => {
    const { deliveryId } = job.data;
    const delivery = await prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: { webhookEndpoint: true },
    });

    if (!delivery) {
      throw new Error(`Webhook delivery ${deliveryId} not found.`);
    }

    if (delivery.webhookEndpoint.status !== "ACTIVE") {
      await prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: { status: "FAILED", responseBody: "Webhook endpoint inactive." },
      });
      return;
    }

    await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: "PROCESSING",
        attempt: { increment: 1 },
      },
    });

    const payloadString = JSON.stringify(delivery.eventPayload);
    const signature = createHash("sha256")
      .update(`${delivery.webhookEndpoint.signingSecret}:${payloadString}`)
      .digest("hex");

    try {
      const response = await fetch(delivery.webhookEndpoint.url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-ip-signature": signature,
          "x-ip-event-type": delivery.eventType,
        },
        body: payloadString,
      });

      const responseBody = await response.text();
      const status = response.ok ? "SUCCESS" : "FAILED";

      await prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status,
          responseCode: response.status,
          responseBody: responseBody.slice(0, 2000),
          deliveredAt: response.ok ? new Date() : null,
          nextRetryAt: response.ok ? null : new Date(Date.now() + 30_000),
        },
      });

      if (!response.ok) {
        throw new Error(`Webhook delivery failed with status ${response.status}`);
      }
    } catch (error) {
      await prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: "FAILED",
          responseBody: String(error).slice(0, 2000),
          nextRetryAt: new Date(Date.now() + 30_000),
        },
      });
      throw error;
    }
  },
  { connection },
);

worker.on("completed", (job) => {
  workerLogger.info("completed verification job", { jobId: job.id });
});

worker.on("failed", (job, err) => {
  workerLogger.error("failed verification job", { jobId: job?.id, error: String(err) });

  const verificationRequestId = job?.data?.verificationRequestId;
  const verificationCheckId = job?.data?.verificationCheckId;

  if (!verificationRequestId) {
    return;
  }

  void prisma.$transaction(async (tx) => {
    const requestRecord = await tx.verificationRequest.findUnique({
      where: { id: verificationRequestId },
      select: { tenantId: true, subjectId: true },
    });
    if (!requestRecord) {
      return;
    }

    await tx.verificationRequest.updateMany({
      where: { id: verificationRequestId },
      data: { status: "FAILED" },
    });

    if (verificationCheckId) {
      await tx.verificationCheck.updateMany({
        where: { id: verificationCheckId },
        data: {
          status: "FAILED",
          errorCode: "WORKER_FAILURE",
          completedAt: new Date(),
        },
      });
    }

    await tx.auditLog.create({
      data: {
        tenantId: requestRecord.tenantId,
        actionType: "VERIFICATION_FAILED",
        resourceType: "VerificationRequest",
        resourceId: verificationRequestId,
        outcome: "FAILURE",
        metadataJson: {
          verificationCheckId: verificationCheckId ?? null,
          reason: "WORKER_FAILURE",
        } as any,
      },
    });

    const payloadHash = createHash("sha256")
      .update(
        JSON.stringify({
          verificationRequestId,
          reason: "WORKER_FAILURE",
        }),
      )
      .digest("hex");
    const nonce = createHash("sha256")
      .update(`${verificationRequestId}:${Date.now()}:failed`)
      .digest("hex")
      .slice(0, 32);
    const signedSignature = createHash("sha256")
      .update(`placeholder:${payloadHash}:${nonce}`)
      .digest("hex");

    await tx.signedAction.create({
      data: {
        tenantId: requestRecord.tenantId,
        subjectId: requestRecord.subjectId,
        contextType: "verification_worker",
        actionType: "VERIFICATION_FAILED",
        resourceType: "VerificationRequest",
        resourceId: verificationRequestId,
        payloadHash,
        nonce,
        signature: signedSignature,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        verificationStatus: "PENDING",
      },
    });
  });
});

webhookWorker.on("completed", (job) => {
  workerLogger.info("completed webhook job", { jobId: job.id });
});

webhookWorker.on("failed", (job, err) => {
  workerLogger.error("failed webhook job", { jobId: job?.id, error: String(err) });
});

workerLogger.info("worker online", { redisUrl: workerEnv.REDIS_URL });
