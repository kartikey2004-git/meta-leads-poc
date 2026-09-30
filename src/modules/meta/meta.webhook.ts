import { Router, Request, Response } from 'express';
import { env } from '../../config/env';
import { MetaWebhookPayloadSchema, MetaLeadgenValueSchema } from './meta.schema';

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

router.post('/webhooks/meta', (req: Request, res: Response) => {
  const parsed = MetaWebhookPayloadSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid payload', details: parsed.error.errors });
    return;
  }

  for (const entry of parsed.data.entry) {
    for (const change of entry.changes) {
      if (change.field !== 'leadgen') continue;

      const leadgenParsed = MetaLeadgenValueSchema.safeParse(change.value);

      if (!leadgenParsed.success) {
        console.warn('Received leadgen change with invalid value:', leadgenParsed.error.flatten());
        continue;
      }

      const value = leadgenParsed.data;
      const event = {
        leadgenId: value.leadgen_id,
        formId: value.form_id,
        pageId: value.page_id,
        createdTime: value.created_time,
      };

      console.log(
        `Received Meta lead event\nleadgenId=${event.leadgenId}\nformId=${event.formId}\npageId=${event.pageId}\ncreatedTime=${event.createdTime}`
      );
    }
  }

  res.status(200).json({ received: true });
});

export default router;
