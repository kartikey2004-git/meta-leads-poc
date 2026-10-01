# Meta Leads PoC

A real-time pipeline for Meta Lead Ads. When a lead submits a form on a Meta ad, Meta sends a webhook containing a `leadgen_id`. The backend retrieves the actual lead data from Meta's Graph API, persists it to PostgreSQL, and broadcasts it to connected WebSocket clients in real time.

Built incrementally across three parts: webhook receiver → persistence + WebSocket → full Meta Graph API integration.

## Current progress

**Part 1** — Express server, Meta webhook verification, lead event extraction and logging.

**Part 2** — PostgreSQL persistence via Prisma, idempotent lead storage (`metaLeadId UNIQUE`), WebSocket server broadcasting `lead.created`, `GET /leads` endpoint.

**Part 3** — Meta Graph API v21.0 lead retrieval using `leadgen_id`, field normalization (`full_name` → `name`, `email`, `phone_number` → `phone`, custom fields → JSON), pre-fetch duplicate check to avoid unnecessary API calls, `MetaApiError` handling (Meta failures return 502, DB failures prevented from broadcasting).

## Architecture

```
Meta Lead Testing Tool
        ↓
Meta Webhook (POST /webhooks/meta)
        ↓
leadgen_id extracted
        ↓
Check DB — already exists?
  YES → skip (idempotent)
  NO  ↓
Meta Graph API v21.0
        ↓
Normalize field_data
        ↓
PostgreSQL (source of truth)
        ↓
WebSocket broadcast (lead.created)
        ↓
React Native (Part 4)

REST (GET /leads) → PostgreSQL → initial state / recovery
```

## Setup

```bash
pnpm install
cp .env.example .env
# Edit .env — set META_VERIFY_TOKEN, META_APP_SECRET, META_PAGE_ACCESS_TOKEN, DATABASE_URL
docker compose up -d        # starts PostgreSQL
pnpm prisma migrate dev     # run migrations
pnpm dev
```

## Environment variables

| Variable | Description |
|---|---|
| `META_VERIFY_TOKEN` | Token you set in Meta's webhook configuration |
| `META_APP_SECRET` | Your Meta app secret |
| `META_PAGE_ACCESS_TOKEN` | Page Access Token with `leads_retrieval` + `ads_management` permissions |
| `DATABASE_URL` | PostgreSQL connection string |
| `PORT` | HTTP port (default: 3000) |

## Meta API configuration

The backend uses Meta Graph API **v21.0** (stable, supported until May 2027) to retrieve lead data. Set `META_PAGE_ACCESS_TOKEN` to a Page Access Token belonging to a user with the ADVERTISE task on the page. Required app permissions: `leads_retrieval`, `ads_management`, `pages_manage_ads`.

The token is passed as an `Authorization: Bearer` header and is never logged, returned to clients, or included in URLs.

## Lead retrieval

Meta webhooks only deliver a `leadgen_id`, not the actual lead data. The backend uses that ID to call:

```
GET https://graph.facebook.com/v21.0/{leadgen_id}
```

and retrieves the real name, email, phone and any custom form fields. If the lead already exists in the database, the API call is skipped entirely.

## Field normalization

Meta returns form answers as `field_data: [{ name, values }]`. Known fields map to typed columns:

| Meta field name | DB column |
|---|---|
| `full_name` | `name` |
| `email` | `email` |
| `phone_number` | `phone` |
| anything else | `customFields` (JSON) |

This keeps common fields queryable while preserving custom form questions without requiring schema changes.

## Failure handling

| Failure | Behaviour |
|---|---|
| Meta API error (401/403/404/429) | Returns 502; no lead created, no broadcast |
| Database error | Returns 500; no broadcast |
| WebSocket send fails | Error logged; lead remains in DB, other clients unaffected |
| Duplicate webhook | `findUnique` short-circuits before Meta API call; 200 returned |
| Concurrent duplicates | `metaLeadId UNIQUE` constraint is the final guard (P2002 → treated as duplicate) |

## Testing

Automated tests mock both the Prisma client and Meta Graph API — no real database or Meta account needed.

```bash
pnpm test        # runs all tests (vitest)
pnpm typecheck   # tsc --noEmit
pnpm lint        # eslint
pnpm build       # tsc
```

## Testing locally

```bash
# Webhook verification
curl "http://localhost:3000/webhooks/meta?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test123"

# Connect a WebSocket client
wscat -c ws://localhost:3000/ws

# Send a sample lead webhook (in another terminal)
curl -X POST http://localhost:3000/webhooks/meta \
  -H "Content-Type: application/json" \
  -d '{"object":"page","entry":[{"id":"123","time":1700000000,"changes":[{"field":"leadgen","value":{"leadgen_id":"YOUR_LEADGEN_ID","form_id":"form_xyz","page_id":"page_123","created_time":1700000000}}]}]}'

# Get all persisted leads
curl http://localhost:3000/leads

# Health check
curl http://localhost:3000/health
```

After Meta is configured, use the Meta Lead Testing Tool to send a real test lead. The expected flow:

```
Meta test lead → POST /webhooks/meta → Graph API → PostgreSQL → wscat receives lead.created
```

## Scaling note

If the API is horizontally scaled, each instance would have its own WebSocket connections. A shared pub/sub mechanism such as Redis Pub/Sub could then be introduced so a lead event received by one instance can reach clients connected to another instance.
