import express, { Request, Response } from 'express';
import type { WebSocketServer } from 'ws';
import createMetaWebhookRouter from './modules/meta/meta.webhook';
import leadRouter from './modules/lead/lead.router';

export default function createApp(wss: WebSocketServer): express.Application {
  const app = express();

  app.use(express.json());

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  app.use('/', createMetaWebhookRouter(wss));
  app.use('/', leadRouter);

  return app;
}
