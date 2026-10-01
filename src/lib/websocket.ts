import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';

type PersistedLead = {
  id: string;
  metaLeadId: string;
  formId: string;
  pageId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  customFields: unknown;
  createdTime: Date;
  receivedAt: Date;
};

export function initWebSocket(httpServer: Server): WebSocketServer {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (socket) => {
    console.log('WebSocket client connected');

    socket.on('close', () => {
      console.log('WebSocket client disconnected');
    });

    socket.on('error', (err) => {
      console.error('WebSocket client error:', err.message);
    });

    socket.on('message', () => {
      // no-op: server does not process incoming messages in this PoC
    });
  });

  return wss;
}

export function broadcastLeadCreated(wss: WebSocketServer, lead: PersistedLead): void {
  const message = JSON.stringify({
    type: 'lead.created',
    data: {
      id: lead.id,
      metaLeadId: lead.metaLeadId,
      formId: lead.formId,
      pageId: lead.pageId,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      customFields: lead.customFields,
      createdTime: lead.createdTime,
      receivedAt: lead.receivedAt,
    },
  });

  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message, (err) => {
        if (err) console.error('WebSocket send error:', err.message);
      });
    }
  }
}
