# meta-leads-poc

Real-time pipeline for Meta Lead Ads. When a lead submits a form on a Meta ad, the backend receives a webhook, fetches the lead data from the Graph API, persists it to PostgreSQL, and pushes it instantly to a React Native mobile client over WebSocket.

## Structure

```
meta-leads-poc/
  backend/    Express + WebSocket server, PostgreSQL via Prisma
  frontend/   React Native (Expo) mobile client
```

See each package for its own setup and usage:

- [backend/README.md](backend/README.md)
- [frontend/README.md](frontend/README.md)

## Quick start

**Backend:**

```bash
cd backend
pnpm install
# copy and fill .env at the repo root
docker compose up -d
pnpm exec prisma migrate deploy
pnpm dev
```

**Frontend:**

```bash
cd frontend
npm install
npx expo start
```

Connect a physical Android device via USB, run `adb reverse tcp:8081 tcp:8081 && adb reverse tcp:3000 tcp:3000`, then press `a` in the Expo terminal.

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express, TypeScript |
| Realtime | WebSocket (ws) |
| Database | PostgreSQL, Prisma ORM |
| Mobile | React Native, Expo |
| Testing | Vitest (backend), Jest + jest-expo (frontend) |
