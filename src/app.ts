import express, { Request, Response } from 'express';
import metaWebhookRouter from './modules/meta/meta.webhook';

const app = express();

app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.use('/', metaWebhookRouter);

export default app;
