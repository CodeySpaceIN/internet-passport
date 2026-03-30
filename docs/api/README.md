# API Docs

## Developer API (Phase 12)

- OpenAPI spec: `/v1/openapi.json`
- Developer docs endpoint: `/v1/docs/developer`
- Main spec file: `docs/openapi.yaml`

### Core developer endpoints

- `POST /v1/developer/api-keys`
- `GET /v1/developer/api-keys`
- `POST /v1/developer/api-keys/:id/revoke`
- `POST /v1/developer/trust-check`
- `GET /v1/developer/trust/users/:userId/summary`
- `GET /v1/developer/trust/organizations/:organizationId/summary`
- `GET /v1/developer/trust/agents/:agentId/summary`
- `POST /v1/developer/signed-actions/validate`

### Response envelope

All developer endpoints return:

- `success`
- `data`
- `error`
- `meta`

## Added docs

- [`docs/api/developer-api-reference.md`](./developer-api-reference.md)
- [`docs/api/example-integration-guide.md`](./example-integration-guide.md)
