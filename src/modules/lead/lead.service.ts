import prisma from '../../lib/prisma';
import { getLead } from '../meta/meta.client';
import type { LeadEvent } from '../meta/meta.schema';

type Lead = Awaited<ReturnType<typeof prisma.lead.create>>;

function normalizeFieldData(fieldData: Array<{ name: string; values: string[] }>): {
  name: string | null;
  email: string | null;
  phone: string | null;
  customFields: Record<string, string>;
} {
  const known = new Set(['full_name', 'email', 'phone_number']);
  let name: string | null = null;
  let email: string | null = null;
  let phone: string | null = null;
  const customFields: Record<string, string> = {};

  for (const field of fieldData) {
    const value = field.values[0] ?? null;
    if (field.name === 'full_name') name = value;
    else if (field.name === 'email') email = value;
    else if (field.name === 'phone_number') phone = value;
    else if (!known.has(field.name) && value !== null) customFields[field.name] = value;
  }

  return { name, email, phone, customFields };
}

export async function processLeadEvent(event: LeadEvent): Promise<Lead | null> {
  const existing = await prisma.lead.findUnique({ where: { metaLeadId: event.leadgenId } });
  if (existing) return null;

  const metaLead = await getLead(event.leadgenId);
  const { name, email, phone, customFields } = normalizeFieldData(metaLead.field_data);

  try {
    const lead = await prisma.lead.create({
      data: {
        metaLeadId: event.leadgenId,
        formId: event.formId,
        pageId: event.pageId,
        name,
        email,
        phone,
        customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
        createdTime: new Date(metaLead.created_time),
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
