# Internet Passport Technical Architecture (v1 -> v2)

## Goals

- Verify entities and actions without forcing full identity disclosure
- Produce machine-checkable trust decisions in real time
- Preserve auditability through cryptographically signed events
- Support composable integration via APIs, SDKs, and webhooks

## Core Concepts

- **Subject**: human user, organization, service account, or AI agent
- **Verifier**: trusted service/provider that attests to a claim
- **Claim**: statement about a subject (human-verified, org-domain verified, liveness passed)
- **Credential**: signed package of one or more claims
- **Trust Card**: normalized, portable trust profile derived from credentials + behavioral risk
- **Signed Action**: cryptographically signed record of a sensitive operation

## System Components

1. **Identity Orchestrator**
   - Handles sign-in, identity linking, and session binding
   - Issues internal subject IDs and consent state

2. **Verification Engine**
   - Connects to identity and liveness providers
   - Validates artifacts, normalizes outcomes into signed claims

3. **Trust Decision Engine**
   - Computes risk/trust verdicts for sessions, users, content, and actions
   - Returns confidence score, reason codes, and recommended policy outcome

4. **Agent Identity Service**
   - Registers AI agents and binds them to owning organizations/policies
   - Issues agent tokens and signs delegated action context

5. **Signed Action Ledger**
   - Append-only event log with tamper-evident chain and signatures
   - Records actor, authorization context, policy decision, and resulting action

6. **Developer Platform**
   - REST APIs, server/client SDKs, webhooks, and embeddable trust widgets
   - Dashboard for policy management, case review, and audits

## Data Model (Simplified)

- `subjects(id, type, created_at, status)`
- `identities(id, subject_id, provider, provider_subject_ref, verified_at)`
- `claims(id, subject_id, claim_type, level, evidence_ref, issued_by, issued_at, expires_at, signature)`
- `trust_cards(id, subject_id, score, tier, reasons_json, updated_at)`
- `agents(id, org_subject_id, agent_name, policy_id, key_ref, status)`
- `actions(id, actor_subject_id, actor_type, agent_id, action_type, resource_ref, decision, signed_payload, hash_prev, created_at)`
- `sessions(id, subject_id, device_fingerprint, ip_meta, risk_score, created_at)`

## API Surface (v1)

### Authentication and Subject
- `POST /v1/subjects`
- `POST /v1/sessions`
- `POST /v1/identities/link`

### Verification and Trust
- `POST /v1/verifications/human`
- `POST /v1/verifications/org`
- `POST /v1/trust/evaluate`
- `GET /v1/trust/cards/{subject_id}`

### Agent and Signed Actions
- `POST /v1/agents/register`
- `POST /v1/actions/sign`
- `POST /v1/actions/verify`
- `GET /v1/actions/{id}`

### Events
- `POST /v1/webhooks/test`
- `GET /v1/events`

## Trust Evaluation Flow

1. Client submits subject/session context and requested action.
2. Verification Engine resolves fresh and historical claims.
3. Decision Engine computes risk score and policy verdict:
   - allow
   - step_up
   - deny
   - allow_with_monitoring
4. Signed decision returned with reason codes.
5. If action executed, Signed Action Ledger stores immutable record.

## Security and Privacy Principles

- Selective disclosure: expose only required attributes/claims
- Cryptographic signatures for credentials and sensitive actions
- Key rotation and short-lived tokens by default
- Encryption at rest and in transit
- Regionalized storage options for enterprise compliance
- Retention controls and delete/export capabilities

## Content and Media Provenance (v2)

- Optional ingest pipeline for image/audio/video/doc provenance metadata
- Signature envelopes for generated/edited artifacts
- Voice/deepfake risk scoring as separate callable checks
- Verification receipts attached to media lifecycle events

## Non-Functional Targets (Initial)

- Trust evaluation p95 latency: < 300ms (cached claims path)
- Action signing p95 latency: < 200ms
- API uptime target: 99.9%
- End-to-end audit completeness for high-risk action classes

## Open Protocol Direction

- Public schema for claims, trust card, and signed action payloads
- Language SDKs for verification and signature validation
- Standardized plugin interfaces for ecosystem integrations

The protocol is open for adoption; hosted infrastructure and advanced risk/compliance remain commercial layers.

## Launch Candidate Notes

See [`docs/architecture/launch-readiness-notes.md`](./architecture/launch-readiness-notes.md) for Phase 15 production-readiness updates (health checks, logging redaction/context, error boundaries, and integration test coverage).
