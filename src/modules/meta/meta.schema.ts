import { z } from 'zod';

export const MetaLeadgenValueSchema = z.object({
  leadgen_id: z.string(),
  form_id: z.string(),
  page_id: z.string(),
  created_time: z.number(),
});

export const MetaWebhookChangeSchema = z.object({
  field: z.string(),
  value: z.unknown(),
});

export const MetaWebhookEntrySchema = z.object({
  id: z.string(),
  time: z.number(),
  changes: z.array(MetaWebhookChangeSchema),
});

export const MetaWebhookPayloadSchema = z.object({
  object: z.string(),
  entry: z.array(MetaWebhookEntrySchema),
});

export type LeadEvent = {
  leadgenId: string;
  formId: string;
  pageId: string;
  createdTime: number;
};
