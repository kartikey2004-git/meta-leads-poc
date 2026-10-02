import type { Lead } from '../types/lead';

export type WsStatus = 'connecting' | 'connected' | 'offline';

export interface WebSocketService {
  destroy: () => void;
}

interface WebSocketServiceParams {
  url: string;
  onLeadCreated: (lead: Lead) => void;
  onStatusChange: (status: WsStatus) => void;
  onReconnect: () => void;
}

const MAX_RETRY_DELAY_MS = 30_000;

export function createWebSocketService({
  url,
  onLeadCreated,
  onStatusChange,
  onReconnect,
}: WebSocketServiceParams): WebSocketService {
  let socket: WebSocket | null = null;
  let retryCount = 0;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let destroyed = false;

  function connect(): void {
    if (destroyed) return;

    onStatusChange('connecting');
    socket = new WebSocket(url);

    socket.onopen = () => {
      const wasReconnect = retryCount > 0;
      retryCount = 0;
      onStatusChange('connected');
      if (wasReconnect) onReconnect();
    };

    socket.onmessage = (event: MessageEvent<string>) => {
      try {
        const msg = JSON.parse(event.data) as { type: string; data: unknown };
        if (msg.type === 'lead.created' && msg.data) {
          onLeadCreated(msg.data as Lead);
        }
      } catch {
        // ignore malformed messages
      }
    };

    socket.onclose = () => {
      if (destroyed) return;
      onStatusChange('offline');
      scheduleReconnect();
    };

    socket.onerror = () => {
      // onclose always fires after onerror — handled there
    };
  }

  function scheduleReconnect(): void {
    const delay = Math.min(1_000 * Math.pow(2, retryCount), MAX_RETRY_DELAY_MS);
    retryCount += 1;
    retryTimer = setTimeout(connect, delay);
  }

  function destroy(): void {
    destroyed = true;
    if (retryTimer !== null) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    if (socket !== null) {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onclose = null;
      socket.onerror = null;
      socket.close();
      socket = null;
    }
  }

  connect();
  return { destroy };
}
