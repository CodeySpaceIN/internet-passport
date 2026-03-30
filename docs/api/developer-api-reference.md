# Developer API Reference

Base URL: `http://localhost:4000`

## Auth

- User JWT: `Authorization: Bearer <token>`
- Developer key: `x-api-key: <secret>`

## Health

- `GET /health`
- `GET /v1/health`

```bash
curl "http://localhost:4000/v1/health"
```

## Login

```bash
curl -X POST "http://localhost:4000/v1/auth/login" \
  -H "content-type: application/json" \
  -d '{"email":"founder@internetpassport.dev","password":"ChangeMe123!"}'
```

## Create organization

```bash
curl -X POST "http://localhost:4000/v1/organizations" \
  -H "authorization: Bearer $ACCESS_TOKEN" \
  -H "content-type: application/json" \
  -d '{"name":"Acme Trust","websiteUrl":"https://acme.example"}'
```

## Domain challenge and verification

```bash
curl -X POST "http://localhost:4000/v1/organizations/$ORG_ID/domains/challenges" \
  -H "authorization: Bearer $ACCESS_TOKEN" \
  -H "content-type: application/json" \
  -d '{"domain":"acme.example"}'
```

```bash
curl -X POST "http://localhost:4000/v1/organizations/$ORG_ID/domains/$DOMAIN_CHALLENGE_ID/verify" \
  -H "authorization: Bearer $ACCESS_TOKEN"
```

## Agent creation

```bash
curl -X POST "http://localhost:4000/v1/organizations/$ORG_ID/agents" \
  -H "authorization: Bearer $ACCESS_TOKEN" \
  -H "content-type: application/json" \
  -d '{"displayName":"Fraud Sentinel","handle":"fraud-sentinel","capabilities":["risk-score","fraud-screen"]}'
```

## Developer API key and trust-check

```bash
curl -X POST "http://localhost:4000/v1/developer/api-keys" \
  -H "authorization: Bearer $ACCESS_TOKEN" \
  -H "content-type: application/json" \
  -d '{"name":"checkout-service","scopes":["trust:read","trust:check","actions:verify"]}'
```

```bash
curl -X POST "http://localhost:4000/v1/developer/trust-check" \
  -H "x-api-key: $API_KEY" \
  -H "content-type: application/json" \
  -d '{"targetType":"user","targetId":"user_123"}'
```
