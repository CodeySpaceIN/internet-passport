import type { FastifyReply, FastifyRequest } from "fastify";
import { randomUUID } from "node:crypto";

export function requestIdMiddleware(request: FastifyRequest, reply: FastifyReply, done: () => void) {
  const requestId =
    typeof request.headers["x-request-id"] === "string"
      ? request.headers["x-request-id"]
      : randomUUID();

  request.headers["x-request-id"] = requestId;
  (request as any).requestId = requestId;
  reply.header("x-request-id", requestId);
  done();
}
