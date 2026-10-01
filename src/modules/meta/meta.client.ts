import { env } from '../../config/env';
import { MetaLeadResponseSchema, type MetaLeadResponse } from './meta.schema';

const GRAPH_API_VERSION = 'v21.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export class MetaApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly errorType: string,
    public readonly errorCode: number,
  ) {
    super(`Meta API error: ${errorType} (code ${errorCode})`);
    this.name = 'MetaApiError';
  }
}

export async function getLead(leadgenId: string): Promise<MetaLeadResponse> {
  const url = `${GRAPH_API_BASE}/${leadgenId}`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${env.META_PAGE_ACCESS_TOKEN}`,
      },
    });
  } catch (err) {
    throw new Error(`Network error fetching lead ${leadgenId}: ${err instanceof Error ? err.message : String(err)}`);
  }

  const body = await response.json() as Record<string, unknown>;

  if (!response.ok) {
    const error = body.error as { type?: string; code?: number; message?: string } | undefined;
    const errorType = error?.type ?? 'UnknownError';
    const errorCode = error?.code ?? 0;
    throw new MetaApiError(response.status, errorType, errorCode);
  }

  const parsed = MetaLeadResponseSchema.safeParse(body);
  if (!parsed.success) {
    throw new Error(`Unexpected Meta API response shape for leadgenId ${leadgenId}`);
  }

  return parsed.data;
}
