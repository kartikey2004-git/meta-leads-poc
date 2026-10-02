# Backend

Express + WebSocket server for Meta Lead Ads. When a lead submits a form on a Meta ad, Meta sends a webhook with a `leadgen_id`. The backend retrieves the actual lead data from the Graph API, persists it to PostgreSQL, and broadcasts it to connected WebSocket clients in real time.

Part of the `meta-leads-poc` monorepo. The mobile client lives in `../frontend`.

## Architecture

```
Meta Lead Testing Tool
        |
POST /webhooks/meta
        |
leadgen_id extracted
        |
Check DB - already exists?
  YES -> skip (idempotent)
  NO  -> Meta Graph API v21.0
        |
Normalize field_data
        |
PostgreSQL (source of truth)
        |
WebSocket broadcast (lead.created)
        |
React Native client (../frontend)

GET /leads -> PostgreSQL -> initial load / reconnect recovery
```

## Setup

The `.env` file lives at the monorepo root (`../`). The backend reads it from there via `dotenv`.

### Mock mode (no Meta credentials needed)

```bash
cd meta-leads-poc

cp .env.example .env
# Set META_MOCK_MODE=true in .env

docker compose -f backend/docker-compose.yml up -d
cd backend
pnpm install
pnpm exec prisma migrate deploy
pnpm dev
```

### Production (real Meta API)

```bash
cd meta-leads-poc

cp .env.example .env
# Set META_MOCK_MODE=false and fill in META_PAGE_ACCESS_TOKEN

docker compose -f backend/docker-compose.yml up -d
cd backend
pnpm install
pnpm exec prisma migrate deploy
pnpm dev
```

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `META_VERIFY_TOKEN` | Always | Token you configure in Meta's webhook settings |
| `META_APP_SECRET` | Always | Your Meta app secret |
| `META_PAGE_ACCESS_TOKEN` | Only if `META_MOCK_MODE=false` | Page Access Token with `leads_retrieval` and `ads_management` permissions |
| `META_MOCK_MODE` | Optional | Set to `true` to use fixture data instead of calling the Graph API (default: `false`) |
| `DATABASE_URL` | Always | PostgreSQL connection string |
| `PORT` | Optional | HTTP port (default: 3000) |

## Mock mode

When `META_MOCK_MODE=true` the server returns realistic fixture data without calling Meta. Useful for local development and testing the mobile client without a real Meta page.

Trigger a mock lead:

```bash
curl -X POST http://localhost:3000/dev/trigger-lead \
  -H "Content-Type: application/json" \
  -d '{
    "leadgenId": "lead_dev_001",
    "formId": "form_xyz",
    "pageId": "page_123"
  }'
```

Verify it was saved:

```bash
curl http://localhost:3000/leads
```

The four fixtures cover: full lead (name, email, phone, custom fields), missing optional fields, custom fields only, and empty values. The response shape is identical to a real Graph API response so business logic behaves the same either way.

## Field normalization

Meta returns form answers as `field_data: [{ name, values }]`. Known fields map to typed columns:

| Meta field name | DB column |
|---|---|
| `full_name` | `name` |
| `email` | `email` |
| `phone_number` | `phone` |
| anything else | `customFields` (JSON) |

Custom fields are stored as JSON so new form questions do not require schema changes.

## Failure handling

| Failure | Behaviour |
|---|---|
| Meta API error (401/403/404/429) | Returns 502, no lead created, no broadcast |
| Database error | Returns 500, no broadcast |
| WebSocket send fails | Error logged, lead stays in DB, other clients unaffected |
| Duplicate webhook | `findUnique` short-circuits before Graph API call |
| Concurrent duplicates | `metaLeadId UNIQUE` constraint is the final guard (P2002 treated as duplicate) |

## API endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `GET` | `/webhooks/meta` | Meta webhook verification |
| `POST` | `/webhooks/meta` | Receives lead events from Meta |
| `GET` | `/leads` | Returns all persisted leads, newest first |
| `POST` | `/dev/trigger-lead` | Dev only - triggers a mock lead (unavailable in production) |
| `GET` | `/dev/info` | Dev only - shows mock mode status and available endpoints |
| `WS` | `/ws` | WebSocket connection for real-time lead events |

## Testing

Tests mock both Prisma and the Meta Graph API so no real database or Meta account is needed.

```bash
pnpm test        # run all tests (vitest)
pnpm typecheck   # tsc --noEmit
pnpm lint        # eslint
pnpm build       # tsc
```

Watch mode:

```bash
pnpm test -- --watch
```

Single file:

```bash
pnpm test meta.client.test.ts
```

## Scaling note

Each server instance holds its own WebSocket connections. If the API is scaled horizontally, a shared pub/sub layer such as Redis Pub/Sub would be needed so a lead received by one instance reaches clients on another.
