# Frontend

React Native (Expo) mobile client for Meta Lead Ads. Connects to the backend via WebSocket and displays incoming leads in real time. On load it fetches existing leads from the REST API, then listens for new ones pushed over WebSocket.

Part of the `meta-leads-poc` monorepo. The backend lives in `../backend`.

## Features

- Real-time lead display via WebSocket with live/connecting/offline status indicator
- New badge on leads that arrive via push, not just on page load
- Pull to refresh the list manually
- Exponential backoff reconnection (1s, 2s, 4s... up to 30s) with automatic re-fetch of missed leads on reconnect
- Deduplication: a lead already in the list is never added twice regardless of source

## Setup

```bash
cd meta-leads-poc/frontend
npm install
```

## Running on a physical device (USB)

USB is more reliable than Wi-Fi for development because `adb reverse` tunnels the backend port directly through the cable.

**1. Enable USB Debugging on your phone:**

Settings > About Phone > tap Build Number 7 times > Developer Options > enable USB Debugging

**2. Connect via USB and confirm ADB sees the device:**

```bash
adb devices
```

**3. Forward the ports:**

```bash
adb reverse tcp:8081 tcp:8081   # Metro bundler
adb reverse tcp:3000 tcp:3000   # backend
```

**4. Check `config.ts`:**

Make sure `BACKEND_HOST` is set to `localhost:3000`. This is the default when using USB.

```ts
const BACKEND_HOST = 'localhost:3000';
```

If you are testing over Wi-Fi instead, replace `localhost` with your machine's LAN IP (e.g. `192.168.1.42:3000`).

**5. Start Expo:**

```bash
npx expo start
```

Then press `a` in the Expo terminal to open on the connected Android device.

## Config

`config.ts` exports two constants used across the app:

```ts
export const API_URL  // base URL for REST calls  e.g. http://localhost:3000
export const WS_URL   // WebSocket URL             e.g. ws://localhost:3000/ws
```

Change `BACKEND_HOST` in that file to point to wherever the backend is running.

## Project structure

```
frontend/
  App.tsx               entry point, state management, FlatList
  config.ts             API and WebSocket URLs
  components/
    LeadCard.tsx        renders a single lead with new badge and relative time
    ConnectionStatus.tsx live/connecting/offline dot indicator
  services/
    api.ts              fetchLeads() via REST
    websocket.ts        WebSocket service with reconnect and backoff
  styles/
    index.ts            shared StyleSheet tokens and component styles
  types/
    lead.ts             Lead type
  tests/
    deduplication.test.ts   mergeLeads logic and list deduplication
    websocket.service.test.ts WebSocket service unit tests (fake timers)
```

## Testing

```bash
npm test
```

Tests use Jest with `jest-expo` preset. No running server or device needed.

## Running over Wi-Fi

If you prefer Wi-Fi over USB, skip the `adb reverse` step and update `config.ts` to use your machine's LAN IP:

```ts
const BACKEND_HOST = '192.168.1.42:3000'; // replace with your actual IP
```

Your phone and machine must be on the same network. In the Expo terminal, press `a` or scan the QR code with Expo Go.
