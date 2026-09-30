# Meta Leads PoC

This project is a proof-of-concept backend for receiving and processing Meta Lead Ads events in real time. It implements a webhook receiver that Meta calls whenever a user submits a lead form on Facebook or Instagram. The server validates incoming payloads using Zod and extracts the lead ID for downstream processing.

The project is built incrementally. Part 1 focuses exclusively on the webhook layer: verifying the webhook subscription with Meta and extracting `leadgen_id` from incoming lead events. Future parts will persist leads to PostgreSQL and push them to a React Native app via WebSockets.

This is an internship home assignment demonstrating a clean, production-style Node.js + TypeScript service using Express, Zod, and vitest — kept intentionally simple so every line can be explained.

---

## Current progress

Part 1 currently implements:

- Express server
- Health endpoint (`GET /health`)
- Meta webhook verification (`GET /webhooks/meta`)
- Meta lead webhook validation (`POST /webhooks/meta`)
- Lead event extraction and logging

---

## Setup

```bash
pnpm install
cp .env.example .env
# Fill in META_VERIFY_TOKEN and META_APP_SECRET in .env
pnpm dev
```

> **Windows note:** The above commands work in PowerShell and Git Bash. If `pnpm` is not found, install it with `npm install -g pnpm`.

---

## Environment variables

| Variable            | Description                                                   |
| ------------------- | ------------------------------------------------------------- |
| `META_VERIFY_TOKEN` | Token you set in Meta's webhook configuration panel           |
| `META_APP_SECRET`   | Your Meta app secret (used for HMAC verification in Part 2)   |
| `PORT`              | HTTP port the server listens on (default: `3000`)             |

---

## Testing locally

**Health check:**

```bash
curl http://localhost:3000/health
```

**Webhook verification (simulates Meta's subscription check):**

```bash
curl "http://localhost:3000/webhooks/meta?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test123"
```

Replace `YOUR_TOKEN` with the value of `META_VERIFY_TOKEN` in your `.env`. You should get `test123` back.

**Sample lead webhook (simulates Meta sending a new lead):**

```bash
curl -X POST http://localhost:3000/webhooks/meta \
  -H "Content-Type: application/json" \
  -d '{"object":"page","entry":[{"id":"123","time":1700000000,"changes":[{"field":"leadgen","value":{"leadgen_id":"lead_1","form_id":"form_1","page_id":"page_1","created_time":1700000000}}]}]}'
```

You should see the normalized lead event printed in the server console:

```
Received Meta lead event leadgenId=lead_1 formId=form_1 pageId=page_1 createdTime=1700000000
```

---

## Architecture

```
Meta Lead Testing Tool
  ↓
Webhook (GET /webhooks/meta — subscription verification)
       (POST /webhooks/meta — lead events)
  ↓
Express + TypeScript
  ↓
Zod validation
  ↓
Normalized lead event
  ↓
Console log (Part 1)
```

---

## Next steps

Part 2 will introduce PostgreSQL (via Prisma) to persist lead records, and a WebSocket layer to push new leads in real time to a connected React Native client.
