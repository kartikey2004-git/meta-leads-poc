import { env } from '../../config/env';
import { MetaLeadResponseSchema, type MetaLeadResponse } from './meta.schema';
import { fixtures } from './meta.fixtures';

const GRAPH_API_VERSION = 'v21.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;
const MOCK_MODE = env.META_MOCK_MODE === 'true';

export class MetaApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly errorType: string,
    public readonly errorCode: number
  ) {
    super(`Meta API error: ${errorType} (code ${errorCode})`);
    this.name = 'MetaApiError';
  }
}

export async function getLead(leadgenId: string): Promise<MetaLeadResponse> {
  if (MOCK_MODE) {
    return getMockLead(leadgenId);
  }

  return getRealLead(leadgenId);
}

function getMockLead(leadgenId: string): MetaLeadResponse {
  const fixtureKeys = Object.keys(fixtures) as Array<keyof typeof fixtures>;
  const fixtureIndex =
    Math.abs(leadgenId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) %
    fixtureKeys.length;

  const fixtureKey = fixtureKeys[fixtureIndex];
  const fixture = fixtures[fixtureKey];

  return {
    ...fixture,
    id: leadgenId,
  };
}

async function getRealLead(leadgenId: string): Promise<MetaLeadResponse> {
  const url = `${GRAPH_API_BASE}/${leadgenId}`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${env.META_PAGE_ACCESS_TOKEN}`,
      },
    });
  } catch (err) {
    throw new Error(
      `Network error fetching lead ${leadgenId}: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  const body = (await response.json()) as Record<string, unknown>;

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
