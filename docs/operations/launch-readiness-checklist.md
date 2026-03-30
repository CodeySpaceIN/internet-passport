# Launch Readiness Checklist

## Security

- [x] CORS allowlist support (`ALLOWED_ORIGINS`)
- [x] Basic hardening headers for web + API responses
- [x] Sensitive metadata redaction in structured logs
- [x] API key scope checks and JWT role checks
- [ ] Configure TLS termination and WAF at ingress
- [ ] Rotate secrets in managed secret store before production cutover

## Reliability

- [x] Liveness endpoint (`/health`)
- [x] Deeper dependency health endpoint (`/v1/health`)
- [x] Idempotency support on critical write routes
- [x] Error boundaries for root/public/workspace/admin surfaces
- [ ] Add production alerting for 5xx rates and queue lag

## Documentation

- [x] API reference docs with cURL examples
- [x] Example integration guide
- [x] Architecture launch notes
- [x] Changelog / release notes page

## Testing

- [x] Verification smoke test (`pnpm smoke:verification`)
- [x] Core journey integration test (`pnpm test:core-journeys`)
- [ ] CI pipeline execution for integration scripts

## Performance

- [x] Loading skeletons for major routes
- [x] Empty states for low-data dashboards/tables
- [x] Controlled list limits in API query handlers
- [ ] Add request-level p95 and p99 monitoring dashboards
