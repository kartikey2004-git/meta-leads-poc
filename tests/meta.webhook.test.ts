import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import type { WebSocketServer } from 'ws';

vi.mock('../src/config/env', () => ({
  env: {
    META_VERIFY_TOKEN: 'test-token',
    META_APP_SECRET: 'test-secret',
    DATABASE_URL: 'postgresql://localhost/test',
    PORT: 3000,
  },
}));

const mockCreate = vi.fn();
const mockFindMany = vi.fn();

vi.mock('../src/lib/prisma', () => ({
  default: {
    lead: {
      create: mockCreate,
      findMany: mockFindMany,
    },
  },
}));

const mockBroadcast = vi.fn();
vi.mock('../src/lib/websocket', () => ({
  initWebSocket: vi.fn(),
  broadcastLeadCreated: mockBroadcast,
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

const mockLead = {
  id: 'cuid_1',
  metaLeadId: 'lead_1',
  formId: 'form_1',
  pageId: 'page_1',
  createdTime: new Date(1700000000 * 1000),
  receivedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
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
  it('returns 200 and persists a new lead', async () => {
    mockCreate.mockResolvedValueOnce(mockLead);

    const res = await request(app).post('/webhooks/meta').send(validLeadPayload);

    expect(res.status).toBe(200);
    expect(mockCreate).toHaveBeenCalledOnce();
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        metaLeadId: 'lead_1',
        formId: 'form_1',
        pageId: 'page_1',
        createdTime: new Date(1700000000 * 1000),
      },
    });
  });

  it('broadcasts lead.created after successful persistence', async () => {
    mockCreate.mockResolvedValueOnce(mockLead);

    await request(app).post('/webhooks/meta').send(validLeadPayload);

    expect(mockBroadcast).toHaveBeenCalledOnce();
    expect(mockBroadcast).toHaveBeenCalledWith(mockWss, mockLead);
  });

  it('handles duplicate metaLeadId idempotently — no second row, no second broadcast', async () => {
    mockCreate
      .mockResolvedValueOnce(mockLead)
      .mockRejectedValueOnce(Object.assign(new Error('Unique constraint'), { code: 'P2002' }));

    const res1 = await request(app).post('/webhooks/meta').send(validLeadPayload);
    const res2 = await request(app).post('/webhooks/meta').send(validLeadPayload);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(mockBroadcast).toHaveBeenCalledOnce();
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

  it('returns 200 for non-leadgen field event without touching the database', async () => {
    const payload = {
      object: 'page',
      entry: [{ id: '123', time: 1700000000, changes: [{ field: 'other_field', value: {} }] }],
    };
    const res = await request(app).post('/webhooks/meta').send(payload);
    expect(res.status).toBe(200);
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockBroadcast).not.toHaveBeenCalled();
  });

  it('returns 500 when database throws unexpected error', async () => {
    mockCreate.mockRejectedValueOnce(new Error('Connection refused'));

    const res = await request(app).post('/webhooks/meta').send(validLeadPayload);

    expect(res.status).toBe(500);
    expect(mockBroadcast).not.toHaveBeenCalled();
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
