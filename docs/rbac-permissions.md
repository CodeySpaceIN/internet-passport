# RBAC Permissions Matrix

This matrix defines resource/action permissions used by API authorization checks.

## Roles

- `OWNER`
- `ADMIN`
- `TRUST_REVIEWER`
- `DEVELOPER`
- `ANALYST`

## Permissions

- `api_keys:write`
- `subjects:write`
- `subjects:read`
- `verifications:write`
- `verifications:read`
- `policies:write`
- `trust:evaluate`
- `trust:read`
- `trust:simulate`
- `reviews:write`
- `reviews:read`
- `trust_cards:write`
- `trust_cards:read_public`
- `actions:sign`
- `actions:verify`
- `actions:read`
- `audit:read`
- `webhooks:write`
- `webhooks:read`

## Matrix

| Role | Permissions |
|---|---|
| `OWNER` | all permissions |
| `ADMIN` | all operational permissions (same as owner except ownership semantics) |
| `TRUST_REVIEWER` | subjects, verifications, trust evaluate/read/simulate, reviews, trust cards, actions, audit |
| `DEVELOPER` | subjects write/read, trust cards write/read, actions verify/read, webhooks write/read |
| `ANALYST` | subjects/read, verifications/read, trust/read/simulate, reviews/read, actions/read, audit/read, webhooks/read, trust card public read |

## API Usage Pattern

1. Authenticate request via bearer token.
2. Resolve membership role for tenant.
3. Check role grants the route's required permission.
4. Return `403 FORBIDDEN` when permission is missing.
