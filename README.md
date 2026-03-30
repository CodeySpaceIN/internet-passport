# internet-passport

Internet Passport is a universal trust layer for verifying humans, organizations, content, and AI agents without requiring full identity exposure.

## Phase 2 Foundation

Core scaffolding now includes:
- Next.js App Router + TypeScript strict mode + Tailwind + shadcn baseline
- Dedicated API and worker apps in a pnpm monorepo
- Prisma + PostgreSQL + Redis + BullMQ
- Theme system (dark/light toggle) and reusable UI primitives
- Environment validation modules, middleware, logging, and error utilities
- Dockerized runtime base and local infra via Docker Compose

## Folder Structure

```text
apps/
  web/                    # Next.js app (App Router, theme, ui)
  api/                    # Fastify API service
  worker/                 # BullMQ workers
packages/
  db/                     # Prisma schema/client/seed
  queue/                  # Shared queue contracts
  trust-engine/           # Trust evaluation logic
  verification-core/      # Verification adapter interfaces/providers
  config/                 # Environment schema validation
  core/                   # Shared logger + app error types
docs/
  architecture/           # Architecture placeholders and notes
  api/                    # API docs placeholders
  operations/             # Runbooks and operations placeholders
```

## Sprint 1 Status

Sprint 1 scaffolding is in place:
- `apps/web` for the Next.js App Router dashboard
- `apps/api` for API-first trust services (Fastify)
- `apps/worker` for async jobs (BullMQ + Redis)
- `packages/db` for Prisma schema/client/seed

## Quick Start

1. Install dependencies:
   - `pnpm install`
2. Start local infrastructure:
   - `docker compose up -d`
3. Copy env:
   - `cp .env.example .env`
   - set `AUTH_SECRET` to a strong random value
4. Prepare database:
   - `pnpm db:generate`
   - `pnpm db:push`
   - `pnpm db:seed`
5. Run apps:
   - `pnpm dev`

## Auth and Bootstrap (Sprint 1)

- Web sign-in route: `/sign-in`
- Seeded credentials:
  - email: `founder@internetpassport.dev`
  - password: `ChangeMe123!`

API auth flow:
1. `POST /v1/auth/login` with email/password
2. Use returned `accessToken` as `Authorization: Bearer <token>` for protected API routes

Optional bootstrap flow:
- `POST /v1/bootstrap/tenant-user`
- If `BOOTSTRAP_KEY` is set, send it as `x-bootstrap-key`

## Sprint 2 APIs (Now Available)

- Subject management:
  - `POST /v1/subjects`
  - `GET /v1/subjects`
  - `GET /v1/subjects/:subjectId`
- Verification orchestration:
  - `POST /v1/verifications` (enqueue async verification job)
  - `GET /v1/verifications/:verificationId` (status, checks, claims)

The worker now processes verification jobs and writes:
- `VerificationRequest` status progression (`PENDING -> IN_PROGRESS -> APPROVED`)
- `VerificationCheck` provider results
- normalized `VerificationClaim` records

## Sprint 3 APIs (Now Available)

- Policy management:
  - `POST /v1/policies`
- Trust evaluation:
  - `POST /v1/trust/evaluate`
  - `GET /v1/trust/decisions`

The trust evaluation endpoint now:
- loads active policy for context
- computes deterministic score + reason codes
- stores `TrustScoreSnapshot`
- creates `TrustDecision`
- updates `TrustProfile`

## Sprint 4 APIs (Now Available)

- Signed actions:
  - `POST /v1/actions/sign`
  - `POST /v1/actions/verify`
  - `GET /v1/actions/:actionId`
- Audit events:
  - `GET /v1/audit/events`

Signed action flow now includes:
- tenant-scoped nonce registration (`ReplayNonce`)
- HMAC signature over payload hash + nonce
- expiration enforcement
- replay detection (already-verified actions are rejected)

Audit model now includes append-only hash chaining:
- `hashPrev` links to previous event hash
- `hashSelf` computed from event body + `hashPrev`

## Sprint 5 APIs (Now Available)

- Review workflow:
  - `POST /v1/reviews/cases`
  - `GET /v1/reviews/cases`
  - `POST /v1/reviews/cases/:id/assign`
  - `POST /v1/reviews/cases/:id/decision`
- Trust card workflow:
  - `POST /v1/trust-cards`
  - `POST /v1/trust-cards/:id/publish`
  - `GET /v1/trust-cards/:slug` (public)
- Webhook operations:
  - `POST /v1/webhooks`
  - `GET /v1/webhooks`
  - `POST /v1/webhooks/:id/replay`

Webhook delivery pipeline now includes:
- queued delivery records (`WebhookDelivery`)
- background delivery worker with retry/backoff
- signed webhook requests (`x-ip-signature`)
- replay of latest failed delivery

## Sprint 6 Hardening (Now Available)

- Global API rate limiting (Fastify rate-limit plugin)
- Idempotency key support on critical write endpoints via `x-idempotency-key`:
  - `POST /v1/verifications`
  - `POST /v1/trust/evaluate`
  - `POST /v1/actions/sign`
  - `POST /v1/reviews/cases/:id/decision`
- Non-persistent trust policy simulation:
  - `POST /v1/trust/simulate`

## Sprint 12 Developer API (Now Available)

- Developer API key lifecycle:
  - `POST /v1/developer/api-keys`
  - `GET /v1/developer/api-keys`
  - `POST /v1/developer/api-keys/:id/revoke`
- API-key authenticated trust surfaces:
  - `POST /v1/developer/trust-check`
  - `GET /v1/developer/trust/users/:userId/summary`
  - `GET /v1/developer/trust/organizations/:organizationId/summary`
  - `GET /v1/developer/trust/agents/:agentId/summary`
  - `POST /v1/developer/signed-actions/validate`
- OpenAPI and docs:
  - `GET /v1/openapi.json`
  - `GET /v1/docs/developer`

Developer API response envelope:
- `success`
- `data`
- `error`
- `meta`

Example:
- `curl -X POST http://localhost:4000/v1/developer/trust-check -H "x-api-key: $API_KEY" -H "content-type: application/json" -d '{"targetType":"user","targetId":"user_123"}'`

## Phase 15 Launch Readiness (Now Available)

- Documentation:
  - public docs pages: `/docs`, `/docs/api-reference`, `/docs/integration-guide`, `/changelog`
  - deep docs: `docs/api/developer-api-reference.md`, `docs/api/example-integration-guide.md`
- UX polish:
  - route-level error boundaries (root/public/workspace/admin)
  - toast notifications for sign-in/sign-up/onboarding/API-key lifecycle
  - loading and empty states expanded for admin + org workspaces
- Observability and reliability:
  - health checks: `GET /health` and `GET /v1/health`
  - structured logging redaction + contextual child loggers
  - CORS allowlist via `ALLOWED_ORIGINS`
- New organization API surfaces:
  - `POST /v1/organizations`
  - `POST /v1/organizations/:orgId/domains/challenges`
  - `POST /v1/organizations/:orgId/domains/:domainId/verify`
  - `POST /v1/organizations/:orgId/agents`
- Integration test coverage:
  - `pnpm smoke:verification`
  - `pnpm test:core-journeys`
  - `pnpm test:all`

## Smoke Test

Run this after `pnpm dev` is up:
- `pnpm smoke:verification`

What it validates:
1. login (`POST /v1/auth/login`)
2. subject creation (`POST /v1/subjects`)
3. verification enqueue (`POST /v1/verifications`)
4. async completion polling (`GET /v1/verifications/:verificationId`)

Optional env overrides:
- `API_BASE_URL` (default `http://localhost:4000`)
- `SMOKE_EMAIL` (default seeded founder email)
- `SMOKE_PASSWORD` (default seeded founder password)
- `SMOKE_POLL_ATTEMPTS` (default `12`)
- `SMOKE_POLL_DELAY_MS` (default `1000`)

Core journey integration test:
- `pnpm test:core-journeys`

Optional overrides:
- `CORE_TEST_POLL_ATTEMPTS` (default `12`)
- `CORE_TEST_POLL_DELAY_MS` (default `1000`)

Database migration and drift scripts:
- `pnpm db:migrate`
- `pnpm db:migrate:deploy`
- `pnpm db:drift`

## Docs

- [`docs/investor-memo.md`](docs/investor-memo.md)
- [`docs/technical-architecture.md`](docs/technical-architecture.md)
- [`docs/90-day-roadmap.md`](docs/90-day-roadmap.md)
- [`docs/execution-blueprint-v1.md`](docs/execution-blueprint-v1.md)
- [`docs/rbac-permissions.md`](docs/rbac-permissions.md)
- [`docs/openapi.yaml`](docs/openapi.yaml)
- [`docs/api/developer-api-reference.md`](docs/api/developer-api-reference.md)
- [`docs/api/example-integration-guide.md`](docs/api/example-integration-guide.md)
- [`docs/architecture/launch-readiness-notes.md`](docs/architecture/launch-readiness-notes.md)
- [`docs/operations/launch-readiness-checklist.md`](docs/operations/launch-readiness-checklist.md)
