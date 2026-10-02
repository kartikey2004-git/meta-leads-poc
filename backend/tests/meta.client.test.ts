import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getLead, MetaApiError } from '../src/modules/meta/meta.client';

vi.mock('../src/config/env', () => ({
  env: {
    META_VERIFY_TOKEN: 'test-token',
    META_APP_SECRET: 'test-secret',
    META_PAGE_ACCESS_TOKEN: 'test-page-token',
    DATABASE_URL: 'postgresql://localhost/test',
    PORT: 3000,
  },
}));

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const validMetaResponse = {
  id: 'lead_123',
  created_time: '2024-01-15T10:30:00+0000',
  form_id: 'form_456',
  field_data: [
    { name: 'full_name', values: ['John Doe'] },
    { name: 'email', values: ['john@example.com'] },
    { name: 'phone_number', values: ['+1-555-0100'] },
  ],
};

function mockOkResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  };
}

function mockErrorResponse(status: number, errorBody: unknown) {
  return {
    ok: false,
    status,
    json: async () => errorBody,
  };
}

describe('getLead', () => {
  it('returns the Meta lead response on success', async () => {
    mockFetch.mockResolvedValueOnce(mockOkResponse(validMetaResponse));

    const result = await getLead('lead_123');

    expect(result.id).toBe('lead_123');
    expect(result.field_data).toHaveLength(3);
    expect(result.field_data[0]).toEqual({ name: 'full_name', values: ['John Doe'] });
  });

  it('calls Graph API v21.0 with Authorization header, not access_token query param', async () => {
    mockFetch.mockResolvedValueOnce(mockOkResponse(validMetaResponse));

    await getLead('lead_123');

    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('graph.facebook.com/v21.0/lead_123');
    expect(url).not.toContain('access_token');
    expect((options.headers as Record<string, string>)['Authorization']).toBe(
      'Bearer test-page-token'
    );
  });

  it('throws MetaApiError on OAuthException (invalid token)', async () => {
    mockFetch.mockResolvedValueOnce(
      mockErrorResponse(400, {
        error: { type: 'OAuthException', code: 190, message: 'Invalid token' },
      })
    );

    const err = await getLead('lead_123').catch((e) => e);
    expect(err).toBeInstanceOf(MetaApiError);
    expect(err.errorType).toBe('OAuthException');
    expect(err.errorCode).toBe(190);
  });

  it('throws MetaApiError on 403 insufficient permissions', async () => {
    mockFetch.mockResolvedValueOnce(
      mockErrorResponse(403, {
        error: { type: 'GraphMethodException', code: 200, message: 'Permissions error' },
      })
    );

    const err = await getLead('lead_123').catch((e) => e);
    expect(err).toBeInstanceOf(MetaApiError);
    expect(err.statusCode).toBe(403);
  });

  it('throws MetaApiError on lead not found (code 100)', async () => {
    mockFetch.mockResolvedValueOnce(
      mockErrorResponse(400, {
        error: { type: 'GraphMethodException', code: 100, message: 'Invalid parameter' },
      })
    );

    const err = await getLead('lead_123').catch((e) => e);
    expect(err).toBeInstanceOf(MetaApiError);
    expect(err.errorCode).toBe(100);
  });

  it('throws MetaApiError on rate limit (code 80004)', async () => {
    mockFetch.mockResolvedValueOnce(
      mockErrorResponse(400, {
        error: { type: 'OAuthException', code: 80004, message: 'Rate limit' },
      })
    );

    const err = await getLead('lead_123').catch((e) => e);
    expect(err).toBeInstanceOf(MetaApiError);
    expect(err.errorCode).toBe(80004);
  });

  it('throws a network error when fetch rejects', async () => {
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    await expect(getLead('lead_123')).rejects.toThrow('Network error');
  });
});
