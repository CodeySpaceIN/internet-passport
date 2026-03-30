# Internet Passport Execution Blueprint (Phase 1)

This blueprint translates the architecture into implementation-ready artifacts for the first build cycle.

## 1) Prisma Schema Draft (High-Level, MVP-Oriented)

This is intentionally a draft model map, not a final migration file. It is optimized for:
- strict multi-tenancy
- auditability
- extensibility for paid modules later

### Core tenancy and access

- `Tenant`
  - `id`, `name`, `slug`, `status`, `createdAt`, `updatedAt`
- `Workspace`
  - `id`, `tenantId`, `name`, `slug`, `status`, timestamps
- `User`
  - `id`, `email`, `name`, `imageUrl`, `status`, timestamps
- `Membership`
  - `id`, `tenantId`, `workspaceId?`, `userId`, `role`, `status`, timestamps
- `ApiClient`
  - `id`, `tenantId`, `name`, `clientType` (server/public), `status`, timestamps
- `ApiKey`
  - `id`, `apiClientId`, `keyPrefix`, `keyHash`, `scopes[]`, `expiresAt?`, `revokedAt?`

### Subject and identity

- `Subject`
  - `id`, `tenantId`, `workspaceId?`, `subjectType` (`HUMAN`,`DEVELOPER`,`ORG`,`AGENT`), `displayName`, `status`, timestamps
- `IdentityCredential`
  - `id`, `subjectId`, `providerType` (`EMAIL`,`GOOGLE`,`GITHUB`,`DOMAIN`,`WALLET`,`CUSTOM`)
  - `providerRef`, `isVerified`, `verifiedAt?`, `metadataJson`, timestamps

### Verification and claims

- `VerificationRequest`
  - `id`, `tenantId`, `subjectId`, `verificationType`, `status`, `initiatedByUserId?`
  - `policyVersion`, `requestedAt`, `completedAt?`
- `VerificationCheck`
  - `id`, `verificationRequestId`, `provider`, `providerCheckRef`, `status`
  - `rawResultHash?`, `startedAt`, `completedAt?`, `errorCode?`
- `VerificationClaim`
  - `id`, `subjectId`, `claimType`, `claimLevel`, `valueJson`
  - `issuer`, `issuedAt`, `expiresAt?`, `signature`, `revokedAt?`
- `EvidenceArtifact`
  - `id`, `verificationCheckId`, `storageUri`, `mimeType`, `sha256`
  - `sizeBytes`, `encryptionKeyRef?`, `retentionUntil?`

### Trust engine

- `Policy`
  - `id`, `tenantId`, `name`, `contextType`, `version`, `isActive`, `definitionJson`, timestamps
- `TrustProfile`
  - `id`, `subjectId`, `currentScore`, `currentTier`, `lastEvaluatedAt`
- `TrustScoreSnapshot`
  - `id`, `subjectId`, `policyId`, `score`, `tier`, `reasonCodes[]`, `featuresHash`, `createdAt`
- `TrustDecision`
  - `id`, `tenantId`, `subjectId`, `contextType`, `actionType`, `decision` (`ALLOW`,`STEP_UP`,`REVIEW`,`DENY`)
  - `scoreSnapshotId`, `reasonCodes[]`, `requestRef?`, `createdAt`

### Signed actions and audit

- `SignatureKey`
  - `id`, `tenantId`, `keyRef`, `algorithm`, `status`, `rotatesAt?`, timestamps
- `SignedAction`
  - `id`, `tenantId`, `subjectId`, `agentSubjectId?`, `actionType`, `resourceType`, `resourceId`
  - `payloadHash`, `nonce`, `issuedAt`, `expiresAt`, `signature`, `verificationStatus`
- `ReplayNonce`
  - `id`, `tenantId`, `nonce`, `seenAt`, `expiresAt`
- `AuditEvent`
  - `id`, `tenantId`, `workspaceId?`, `actorType`, `actorRef`, `eventType`
  - `entityType`, `entityId`, `dataJson`, `hashPrev?`, `hashSelf`, `createdAt`
- `AuditExport`
  - `id`, `tenantId`, `requestedByUserId`, `status`, `format`, `storageUri?`, timestamps

### Review workflow

- `ReviewCase`
  - `id`, `tenantId`, `subjectId`, `caseType`, `priority`, `status`, `openedAt`, `closedAt?`
- `ReviewTask`
  - `id`, `reviewCaseId`, `assignedToUserId?`, `taskType`, `status`, `dueAt?`, timestamps
- `ReviewDecision`
  - `id`, `reviewCaseId`, `deciderUserId`, `decision`, `rationale`, `createdAt`

### Trust card and public surface

- `TrustCard`
  - `id`, `subjectId`, `slug`, `isPublic`, `headline`, `summary`, `lastPublishedAt?`
- `TrustCardBadge`
  - `id`, `trustCardId`, `badgeType`, `label`, `status`, `issuedAt`, `expiresAt?`
- `TrustCardVisibility`
  - `id`, `trustCardId`, `fieldKey`, `visibility` (`PUBLIC`,`LINK_ONLY`,`PRIVATE`)

### Integrations

- `WebhookEndpoint`
  - `id`, `tenantId`, `url`, `signingSecretHash`, `subscribedEvents[]`, `status`
- `WebhookDelivery`
  - `id`, `webhookEndpointId`, `eventId`, `attempt`, `status`, `responseCode?`, `nextRetryAt?`

---

## 2) API Endpoint Plan (MVP Contract Surface)

All endpoints are versioned (`/v1`), tenant-scoped, and documented in OpenAPI.

### Auth and clients

- `POST /v1/auth/session`
- `POST /v1/auth/token/refresh`
- `POST /v1/api-clients`
- `POST /v1/api-keys`
- `DELETE /v1/api-keys/{id}`

### Subjects and identities

- `POST /v1/subjects`
- `GET /v1/subjects/{id}`
- `GET /v1/subjects`
- `POST /v1/subjects/{id}/identities`
- `PATCH /v1/subjects/{id}`

### Verification

- `POST /v1/verifications`
  - Starts a verification workflow
- `GET /v1/verifications/{id}`
- `POST /v1/verifications/{id}/checks/{checkId}/retry`
- `POST /v1/verifications/{id}/cancel`

### Trust decisions

- `POST /v1/trust/evaluate`
  - Input: `subjectId`, `contextType`, `actionType`, optional request context
  - Output: `decision`, `score`, `tier`, `reasonCodes`, `decisionId`
- `GET /v1/trust/profiles/{subjectId}`
- `GET /v1/trust/decisions/{decisionId}`

### Signed actions

- `POST /v1/actions/sign`
- `POST /v1/actions/verify`
- `GET /v1/actions/{id}`

### Review and trust ops

- `GET /v1/reviews/cases`
- `POST /v1/reviews/cases`
- `POST /v1/reviews/cases/{id}/assign`
- `POST /v1/reviews/cases/{id}/decision`

### Trust cards (public and private)

- `GET /v1/trust-cards/{slug}` (public, signed response metadata)
- `POST /v1/trust-cards`
- `PATCH /v1/trust-cards/{id}`
- `POST /v1/trust-cards/{id}/publish`

### Audit and webhooks

- `GET /v1/audit/events`
- `POST /v1/audit/exports`
- `GET /v1/audit/exports/{id}`
- `POST /v1/webhooks`
- `GET /v1/webhooks`
- `POST /v1/webhooks/{id}/replay`

### API standards

- Idempotency required on: `verifications.create`, `trust.evaluate`, `actions.sign`, `reviews.decision`
- Correlation IDs required for every request/response
- Webhooks are signed (`x-ip-signature`) and replay-safe
- Uniform error envelope: `code`, `message`, `details`, `requestId`

---

## 3) 6-Week MVP Sprint Plan (Tickets + Acceptance Criteria)

## Sprint 1 (Week 1-2): Foundations

### EPIC A: Repo and platform baseline

- Ticket: `A1 Monorepo scaffold (pnpm + turbo + shared packages)`
  - Acceptance:
    - `apps/web`, `apps/api`, `apps/worker` boot
    - shared TS config and lint rules
    - Docker Compose for Postgres + Redis

- Ticket: `A2 Auth and tenancy skeleton`
  - Acceptance:
    - user login works (provider + email fallback)
    - tenant creation and membership persistence
    - role on membership enforced on one protected endpoint

- Ticket: `A3 Prisma baseline schema and migration pipeline`
  - Acceptance:
    - initial migration applies cleanly
    - seed script creates demo tenant/user/subject
    - CI check validates schema drift

## Sprint 2 (Week 2-3): Subject + verification

### EPIC B: Identity and verification orchestration

- Ticket: `B1 Subject CRUD + identity linkage`
  - Acceptance:
    - create/read/list subjects per tenant
    - link at least email and GitHub identity
    - tenant boundary tests pass

- Ticket: `B2 Verification orchestrator + queue wiring`
  - Acceptance:
    - `POST /verifications` enqueues job
    - worker updates status transitions
    - retries and dead-letter queue configured

- Ticket: `B3 Provider adapter interface + mock adapter`
  - Acceptance:
    - interface supports initiate/status/normalize/cancel
    - mock provider returns normalized claims
    - claim persistence and expiration fields validated

## Sprint 3 (Week 3-4): Trust engine v1

### EPIC C: Score and decisioning

- Ticket: `C1 Policy model and rule evaluator`
  - Acceptance:
    - policy versioning enabled
    - evaluator handles allow/step-up/review/deny
    - reason code mapping implemented

- Ticket: `C2 Trust score snapshot and decision endpoint`
  - Acceptance:
    - `POST /trust/evaluate` returns deterministic decision
    - snapshot persisted for each evaluation
    - replaying same input with same policy version yields same output

- Ticket: `C3 Basic dashboard decision timeline`
  - Acceptance:
    - recent decisions visible in web app
    - filter by subject/context/decision

## Sprint 4 (Week 4-5): Signed actions + audit

### EPIC D: Integrity and traceability

- Ticket: `D1 Signed action issue/verify endpoints`
  - Acceptance:
    - sign endpoint produces nonce + signature
    - verify endpoint validates signature and expiry
    - replay attack with same nonce is blocked

- Ticket: `D2 Audit event model and append pipeline`
  - Acceptance:
    - key system events generate audit events
    - hash chaining persisted (`hashPrev`, `hashSelf`)
    - basic export endpoint returns paginated event stream

## Sprint 5 (Week 5-6): Review + public trust card + launch readiness

### EPIC E: Operational trust workflows

- Ticket: `E1 Review case workflow`
  - Acceptance:
    - case create/assign/decision APIs functional
    - reviewer-only actions enforced with RBAC
    - decision actions generate audit records

- Ticket: `E2 Trust card publication`
  - Acceptance:
    - subject can publish trust card with selectable fields
    - public endpoint serves redacted profile safely
    - badge state reflects active claims only

- Ticket: `E3 Webhooks and API reliability controls`
  - Acceptance:
    - webhook subscribe/delivery/retry/replay works
    - idempotency keys enforced on critical endpoints
    - rate limiting enabled for public API

### Exit criteria for Phase 1

- One full flow works in staging:
  - create subject -> run verification -> evaluate trust -> sign action -> audit trace -> publish trust card
- API contracts documented in OpenAPI and smoke-tested
- Security review completed for auth, tenancy isolation, replay protection, and webhook signatures

---

## 4) Suggested Immediate Next Deliverables

1. Freeze this schema into `packages/db/prisma/schema.prisma` (initial version only)
2. Publish `openapi.yaml` with the endpoint list above
3. Create sprint board with the tickets from section 3
4. Implement a single end-to-end happy path before adding extra providers
