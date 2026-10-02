import { Router, Request, Response } from 'express';
import type { WebSocketServer } from 'ws';
import rateLimit from 'express-rate-limit';
import { env } from '../../config/env';
import { MetaWebhookPayloadSchema, MetaLeadgenValueSchema } from './meta.schema';
import { MetaApiError } from './meta.client';
import { processLeadEvent } from '../lead/lead.service';
import { broadcastLeadCreated } from '../../lib/websocket';

const webhookRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' },
});

export default function createMetaWebhookRouter(wss: WebSocketServer): Router {
  const router = Router();

  router.get('/webhooks/meta', (req: Request, res: Response) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === env.META_VERIFY_TOKEN) {
      res.status(200).send(challenge);
      return;
    }

    res.status(403).json({ error: 'Forbidden' });
  });

  router.post('/webhooks/meta', webhookRateLimit, async (req: Request, res: Response) => {
    const parsed = MetaWebhookPayloadSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid payload', details: parsed.error.errors });
      return;
    }

    try {
      for (const entry of parsed.data.entry) {
        for (const change of entry.changes) {
          if (change.field !== 'leadgen') continue;

          const leadgenParsed = MetaLeadgenValueSchema.safeParse(change.value);

          if (!leadgenParsed.success) {
            console.warn(
              'Received leadgen change with invalid value:',
              leadgenParsed.error.flatten()
            );
            continue;
          }

          const value = leadgenParsed.data;
          const event = {
            leadgenId: value.leadgen_id,
            formId: value.form_id,
            pageId: value.page_id,
            createdTime: value.created_time,
          };

          const lead = await processLeadEvent(event);

          if (lead) {
            console.log(
              `Lead persisted: metaLeadId=${lead.metaLeadId} formId=${lead.formId} name=${lead.name ?? 'n/a'}`
            );
            broadcastLeadCreated(wss, lead);
          } else {
            console.log(`Duplicate lead ignored: leadgenId=${event.leadgenId}`);
          }
        }
      }

      res.status(200).json({ received: true });
    } catch (err) {
      if (err instanceof MetaApiError) {
        console.error(
          `Meta API error for webhook: ${err.errorType} code=${err.errorCode} status=${err.statusCode}`
        );
        res.status(502).json({ error: 'Failed to retrieve lead from Meta' });
        return;
      }
      console.error('Failed to process webhook:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
