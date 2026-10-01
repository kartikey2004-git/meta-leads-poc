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

export const MetaFieldDataItemSchema = z.object({
  name: z.string(),
  values: z.array(z.string()),
});

export const MetaLeadResponseSchema = z.object({
  id: z.string(),
  created_time: z.string(),
  form_id: z.string().optional(),
  ad_id: z.string().optional(),
  field_data: z.array(MetaFieldDataItemSchema),
});

export type MetaLeadResponse = z.infer<typeof MetaLeadResponseSchema>;
