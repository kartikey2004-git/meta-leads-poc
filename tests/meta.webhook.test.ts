import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

vi.mock('../src/config/env', () => ({
  env: { META_VERIFY_TOKEN: 'test-token', META_APP_SECRET: 'test-secret', PORT: 3000 },
}));

const { default: app } = await import('../src/app');

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
  it('returns 200 for valid lead payload', async () => {
    const res = await request(app)
      .post('/webhooks/meta')
      .send(validLeadPayload);
    expect(res.status).toBe(200);
  });

  it('returns 400 for malformed JSON', async () => {
    const res = await request(app)
      .post('/webhooks/meta')
      .set('Content-Type', 'application/json')
      .send('not-json');
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing required fields', async () => {
    const res = await request(app)
      .post('/webhooks/meta')
      .send({ object: 'page' });
    expect(res.status).toBe(400);
  });

  it('returns 200 for non-leadgen field event', async () => {
    const payload = {
      object: 'page',
      entry: [
        {
          id: '123',
          time: 1700000000,
          changes: [
            {
              field: 'other_field',
              value: {},
            },
          ],
        },
      ],
    };
    const res = await request(app).post('/webhooks/meta').send(payload);
    expect(res.status).toBe(200);
  });
});
