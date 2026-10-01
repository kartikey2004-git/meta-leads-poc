import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import type { WebSocketServer } from 'ws';

vi.mock('../src/config/env', () => ({
  env: {
    META_VERIFY_TOKEN: 'test-token',
    META_APP_SECRET: 'test-secret',
    META_PAGE_ACCESS_TOKEN: 'test-page-token',
    DATABASE_URL: 'postgresql://localhost/test',
    PORT: 3000,
  },
}));

const mockCreate = vi.fn();
const mockFindMany = vi.fn();
const mockFindUnique = vi.fn();

vi.mock('../src/lib/prisma', () => ({
  default: {
    lead: {
      create: mockCreate,
      findMany: mockFindMany,
      findUnique: mockFindUnique,
    },
  },
}));

const mockBroadcast = vi.fn();
vi.mock('../src/lib/websocket', () => ({
  initWebSocket: vi.fn(),
  broadcastLeadCreated: mockBroadcast,
}));

const mockGetLead = vi.fn();
vi.mock('../src/modules/meta/meta.client', () => ({
  getLead: mockGetLead,
  MetaApiError: class MetaApiError extends Error {
    statusCode: number;
    errorType: string;
    errorCode: number;
    constructor(statusCode: number, errorType: string, errorCode: number) {
      super(`Meta API error: ${errorType} (code ${errorCode})`);
      this.name = 'MetaApiError';
      this.statusCode = statusCode;
      this.errorType = errorType;
      this.errorCode = errorCode;
    }
  },
}));

const { default: createApp } = await import('../src/app');

const mockWss = {} as WebSocketServer;
const app = createApp(mockWss);

const validLeadPayload = {
  object: 'page',
  entry: [
    {
      id: '123',
      time: 1700000000,
      changes: [
        {
          field: 'leadgen',
          value: {
            leadgen_id: 'lead_1',
            form_id: 'form_1',
            page_id: 'page_1',
            created_time: 1700000000,
          },
        },
      ],
    },
  ],
};

const mockMetaLeadResponse = {
  id: 'lead_1',
  created_time: '2023-11-14T22:13:20+0000',
  form_id: 'form_1',
  field_data: [
    { name: 'full_name', values: ['John Doe'] },
    { name: 'email', values: ['john@example.com'] },
    { name: 'phone_number', values: ['+1-555-0100'] },
  ],
};

const mockLead = {
  id: 'cuid_1',
  metaLeadId: 'lead_1',
  formId: 'form_1',
  pageId: 'page_1',
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+1-555-0100',
  customFields: null,
  createdTime: new Date('2023-11-14T22:13:20+0000'),
  receivedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockFindUnique.mockResolvedValue(null);
});

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('GET /webhooks/meta - verification', () => {
  it('returns 200 and the challenge when token matches', async () => {
    const res = await request(app).get('/webhooks/meta').query({
      'hub.mode': 'subscribe',
      'hub.verify_token': 'test-token',
      'hub.challenge': 'abc123',
    });
    expect(res.status).toBe(200);
    expect(res.text).toBe('abc123');
  });

  it('returns 403 when token does not match', async () => {
    const res = await request(app).get('/webhooks/meta').query({
      'hub.mode': 'subscribe',
      'hub.verify_token': 'wrong-token',
      'hub.challenge': 'abc123',
    });
    expect(res.status).toBe(403);
  });

  it('returns 403 when mode is not subscribe', async () => {
    const res = await request(app).get('/webhooks/meta').query({
      'hub.mode': 'unsubscribe',
      'hub.verify_token': 'test-token',
      'hub.challenge': 'abc123',
    });
    expect(res.status).toBe(403);
  });
});

describe('POST /webhooks/meta - lead webhook', () => {
  it('calls Meta API, persists, and broadcasts on new lead', async () => {
    mockGetLead.mockResolvedValueOnce(mockMetaLeadResponse);
    mockCreate.mockResolvedValueOnce(mockLead);

    const res = await request(app).post('/webhooks/meta').send(validLeadPayload);

    expect(res.status).toBe(200);
    expect(mockGetLead).toHaveBeenCalledWith('lead_1');
    expect(mockCreate).toHaveBeenCalledOnce();
    expect(mockBroadcast).toHaveBeenCalledWith(mockWss, mockLead);
  });

  it('skips Meta API call when lead already exists in DB', async () => {
    mockFindUnique.mockResolvedValueOnce(mockLead);

    const res = await request(app).post('/webhooks/meta').send(validLeadPayload);

    expect(res.status).toBe(200);
    expect(mockGetLead).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockBroadcast).not.toHaveBeenCalled();
  });

  it('handles P2002 race condition — no duplicate row, no second broadcast', async () => {
    mockGetLead.mockResolvedValue(mockMetaLeadResponse);
    mockCreate
      .mockResolvedValueOnce(mockLead)
      .mockRejectedValueOnce(Object.assign(new Error('Unique constraint'), { code: 'P2002' }));

    const res1 = await request(app).post('/webhooks/meta').send(validLeadPayload);
    const res2 = await request(app).post('/webhooks/meta').send(validLeadPayload);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(mockBroadcast).toHaveBeenCalledOnce();
  });

  it('returns 502 when Meta API fails — no DB write, no broadcast', async () => {
    const { MetaApiError } = await import('../src/modules/meta/meta.client');
    mockGetLead.mockRejectedValueOnce(new MetaApiError(400, 'OAuthException', 190));

    const res = await request(app).post('/webhooks/meta').send(validLeadPayload);

    expect(res.status).toBe(502);
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockBroadcast).not.toHaveBeenCalled();
  });

  it('returns 500 when database throws unexpected error — no broadcast', async () => {
    mockGetLead.mockResolvedValueOnce(mockMetaLeadResponse);
    mockCreate.mockRejectedValueOnce(new Error('Connection refused'));

    const res = await request(app).post('/webhooks/meta').send(validLeadPayload);

    expect(res.status).toBe(500);
    expect(mockBroadcast).not.toHaveBeenCalled();
  });

  it('returns 400 for malformed JSON', async () => {
    const res = await request(app)
      .post('/webhooks/meta')
      .set('Content-Type', 'application/json')
      .send('not-json');
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing required fields', async () => {
    const res = await request(app).post('/webhooks/meta').send({ object: 'page' });
    expect(res.status).toBe(400);
  });

  it('returns 200 for non-leadgen event — no DB or Meta calls', async () => {
    const payload = {
      object: 'page',
      entry: [{ id: '123', time: 1700000000, changes: [{ field: 'other_field', value: {} }] }],
    };
    const res = await request(app).post('/webhooks/meta').send(payload);
    expect(res.status).toBe(200);
    expect(mockGetLead).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

describe('GET /leads', () => {
  it('returns persisted leads ordered newest first', async () => {
    mockFindMany.mockResolvedValueOnce([mockLead]);

    const res = await request(app).get('/leads');

    expect(res.status).toBe(200);
    expect(mockFindMany).toHaveBeenCalledWith({ orderBy: { receivedAt: 'desc' } });
    expect(res.body).toHaveLength(1);
  });

  it('returns empty array when no leads exist', async () => {
    mockFindMany.mockResolvedValueOnce([]);
    const res = await request(app).get('/leads');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns 500 when database fails', async () => {
    mockFindMany.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app).get('/leads');
    expect(res.status).toBe(500);
  });
});
