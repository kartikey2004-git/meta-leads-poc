import prisma from '../../lib/prisma';
import type { LeadEvent } from '../meta/meta.schema';

type Lead = Awaited<ReturnType<typeof prisma.lead.create>>;

export async function processLeadEvent(event: LeadEvent): Promise<Lead | null> {
  try {
    const lead = await prisma.lead.create({
      data: {
        metaLeadId: event.leadgenId,
        formId: event.formId,
        pageId: event.pageId,
        createdTime: new Date(event.createdTime * 1000),
      },
    });
    return lead;
  } catch (err: unknown) {
    if (err !== null && typeof err === 'object' && 'code' in err && err.code === 'P2002') {
      return null;
    }
    throw err;
  }
}
