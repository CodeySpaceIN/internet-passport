# Example Integration Guide

This guide shows a practical backend integration:

1. authenticate operator
2. provision organization and API key
3. trust-check before high-risk action
4. route uncertain outcomes into review queue

## 1) Login for operator token

```bash
ACCESS_TOKEN=$(curl -s -X POST "http://localhost:4000/v1/auth/login" \
  -H "content-type: application/json" \
  -d '{"email":"founder@internetpassport.dev","password":"ChangeMe123!"}' | jq -r '.accessToken')
```

## 2) Create organization and API key

```bash
ORG_ID=$(curl -s -X POST "http://localhost:4000/v1/organizations" \
  -H "authorization: Bearer $ACCESS_TOKEN" \
  -H "content-type: application/json" \
  -d '{"name":"Acme Launch Org","websiteUrl":"https://acme.example"}' | jq -r '.data.id')
```

```bash
API_KEY=$(curl -s -X POST "http://localhost:4000/v1/developer/api-keys" \
  -H "authorization: Bearer $ACCESS_TOKEN" \
  -H "content-type: application/json" \
  -d "{\"name\":\"acme-runtime\",\"scopes\":[\"trust:read\",\"trust:check\",\"actions:verify\"],\"organizationId\":\"$ORG_ID\"}" | jq -r '.data.secret')
```

## 3) Trust-check call in transaction path

```bash
curl -X POST "http://localhost:4000/v1/developer/trust-check" \
  -H "x-api-key: $API_KEY" \
  -H "content-type: application/json" \
  -d "{\"targetType\":\"organization\",\"targetId\":\"$ORG_ID\",\"contextType\":\"checkout\",\"actionType\":\"payment_authorize\"}"
```

Interpretation guidance:

- `LOW` risk: allow request
- `MEDIUM` risk: require step-up challenge
- `HIGH` risk: deny and open review case

## 4) Open review case + admin decision

```bash
CASE_ID=$(curl -s -X POST "http://localhost:4000/v1/reviews/cases" \
  -H "authorization: Bearer $ACCESS_TOKEN" \
  -H "content-type: application/json" \
  -d '{"subjectId":"subj_123","caseType":"payment_manual_review","priority":"HIGH"}' | jq -r '.id')
```

```bash
curl -X POST "http://localhost:4000/v1/reviews/cases/$CASE_ID/decision" \
  -H "authorization: Bearer $ACCESS_TOKEN" \
  -H "content-type: application/json" \
  -d '{"decision":"APPROVE","rationale":"Validated through secondary evidence"}'
```
