# Internet Passport 90-Day Build Roadmap

## Objective
Ship a production-ready v1 trust platform for one wedge use case:
B2B support and AI-agent-assisted operations.

## Success Metrics

- 2-3 live design partners in production or controlled rollout
- >90% coverage of high-risk support actions with signed records
- 25-40% reduction in verified impersonation incidents in pilot workflows
- p95 trust decision latency under 300ms
- Zero critical security findings in pre-launch review

## Team Assumptions (Lean)

- 1 backend engineer
- 1 full-stack engineer
- 1 ML/risk engineer (or applied data generalist)
- 1 product/design lead
- Fractional security/compliance support

## Phase Plan

### Days 1-30: Foundations

**Product and scope lock**
- Finalize one workflow: support escalation + sensitive account actions
- Define trust policies: allow, step-up, deny, monitor
- Lock API contracts and trust reason-code taxonomy

**Core backend**
- Implement subject/session services
- Implement claim model and trust card storage
- Build `POST /v1/trust/evaluate` and `GET /v1/trust/cards/{subject_id}`

**Security baseline**
- Key management approach, signing service, token lifetimes
- Audit logging and data retention defaults
- Threat model workshop and mitigation backlog

**Partner onboarding**
- Secure 2-3 design partners and map integration points

Deliverables:
- API spec (v1)
- Running trust evaluation service (staging)
- Initial dashboard wireframes

### Days 31-60: Action Integrity and Integrations

**Signed action system**
- Build `POST /v1/actions/sign` and `POST /v1/actions/verify`
- Add append-only ledger with tamper-evident chaining
- Implement policy binding in signed payloads

**Agent identity**
- Build `POST /v1/agents/register`
- Issue agent tokens scoped by org/policy
- Log delegated AI actions with actor context

**Integrations**
- First SDK (TypeScript)
- Webhook events for decision + action outcomes
- Pilot integration in partner support workflow

**Ops and observability**
- SLO dashboards, tracing, alerting
- Case review queue in dashboard (basic)

Deliverables:
- Signed Action Ledger in staging/prod candidate
- Partner sandbox integration complete
- Internal red-team test results

### Days 61-90: Production Readiness and Pilot Results

**Reliability and hardening**
- Load and failure testing
- Rate limits, abuse controls, idempotency, replay protection
- Backup/restore and incident runbooks

**Trust quality**
- Tune risk heuristics and reason-code quality
- Measure false positives/negatives with partner feedback loops
- Add policy simulation mode for safe rollout

**Enterprise readiness**
- SSO/RBAC for dashboard (minimum viable)
- Audit export and immutable evidence package
- Compliance gap assessment for SOC 2 path

**Commercial validation**
- Publish pilot KPI report with before/after metrics
- Convert at least one partner to paid contract

Deliverables:
- v1 production release
- Pilot impact report
- Paid design-partner conversion package

## Milestone Checklist

- Week 2: API schema and event model locked
- Week 4: Trust decision endpoint operational
- Week 6: Action signing and verification complete
- Week 8: First partner live in controlled mode
- Week 10: Policy tuning and simulation deployed
- Week 12: Production launch + KPI readout

## Risks and Mitigations

- **Integration drag**: Provide SDK + reference implementation and weekly partner office hours
- **High false positives**: Start with explainable rules, add conservative thresholds, run silent mode first
- **Security delays**: Shift threat model and key design to first 2 weeks
- **Scope creep**: Reject v2 features (deepfake media scoring/provenance ingest) until v1 KPIs achieved

## Post-90-Day Expansion

- Deepfake/voice-clone risk checks as optional modules
- Provenance signatures for media/docs
- Additional vertical packages (hiring, marketplaces, fintech onboarding)
