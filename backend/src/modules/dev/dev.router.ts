import { Router, Request, Response } from 'express';
import type { WebSocketServer } from 'ws';
import { processLeadEvent } from '../lead/lead.service';
import { broadcastLeadCreated } from '../../lib/websocket';

export default function createDevRouter(wss: WebSocketServer): Router {
  const router = Router();

  router.post('/dev/trigger-lead', async (req: Request, res: Response) => {
    const { leadgenId, formId, pageId, createdTime } = req.body;

    if (!leadgenId || !formId || !pageId) {
      res.status(400).json({
        error: 'Missing required fields: leadgenId, formId, pageId',
      });
      return;
    }

    try {
      const event = {
        leadgenId: leadgenId as string,
        formId: formId as string,
        pageId: pageId as string,
        createdTime: (createdTime as number) ?? Math.floor(Date.now() / 1000),
      };

      const lead = await processLeadEvent(event);

      if (lead) {
        console.log(
          `[DEV] Lead triggered: metaLeadId=${lead.metaLeadId} formId=${lead.formId} name=${lead.name ?? 'n/a'}`
        );
        broadcastLeadCreated(wss, lead);
        res.json({ success: true, lead });
      } else {
        res.json({ success: false, message: 'Duplicate lead' });
      }
    } catch (err) {
      console.error('[DEV] Failed to trigger lead:', err);
      res.status(500).json({
        error: 'Failed to process lead',
        details: err instanceof Error ? err.message : String(err),
      });
    }
  });

  router.get('/dev/info', (_req: Request, res: Response) => {
    res.json({
      mode: 'development',
      mockModeEnabled: process.env.META_MOCK_MODE === 'true',
      endpoints: {
        triggerLead: 'POST /dev/trigger-lead (body: {leadgenId, formId, pageId, createdTime?})',
      },
    });
  });

  return router;
}
