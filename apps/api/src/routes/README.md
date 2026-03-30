# API Routes Module

This folder is reserved for route-splitting by bounded context.

Suggested split:
- `auth.routes.ts`
- `subjects.routes.ts`
- `verification.routes.ts`
- `trust.routes.ts`
- `actions.routes.ts`
- `reviews.routes.ts`
- `webhooks.routes.ts`
- `audit.routes.ts`

Current implementation remains in `src/index.ts` for fast iteration.
