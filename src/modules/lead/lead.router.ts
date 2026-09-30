import { Router, Request, Response } from 'express';
import prisma from '../../lib/prisma';

const router = Router();

router.get('/leads', async (_req: Request, res: Response) => {
  try {
    const leads = await prisma.lead.findMany({
      orderBy: { receivedAt: 'desc' },
    });
    res.json(leads);
  } catch (err) {
    console.error('Failed to fetch leads:', err);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

export default router;
