export type Lead = {
  id: string;
  metaLeadId: string;
  formId: string;
  pageId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  customFields: Record<string, unknown> | null;
  createdTime: string;
  receivedAt: string;
};
