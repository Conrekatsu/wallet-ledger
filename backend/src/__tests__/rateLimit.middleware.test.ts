import express from 'express';
import request from 'supertest';
import { createRateLimiters } from '../middleware/rateLimit';

describe('rate limit middleware', () => {
  it('applies global and stricter write limits', async () => {
    const { globalApiLimiter, strictWriteLimiter } = createRateLimiters({
      globalWindowMs: 60_000,
      globalMax: 5,
      writeWindowMs: 60_000,
      writeMax: 2,
    });

    const app = express();
    app.use('/api', globalApiLimiter);
    app.use('/api/transfers', strictWriteLimiter);
    app.get('/api/health', (_req, res) => res.json({ ok: true }));
    app.post('/api/transfers', (_req, res) => res.json({ ok: true }));

    const health1 = await request(app).get('/api/health');
    const health2 = await request(app).get('/api/health');
    expect(health1.status).toBe(200);
    expect(health2.status).toBe(200);

    const write1 = await request(app).post('/api/transfers').set('x-api-key', 'wk_test');
    const write2 = await request(app).post('/api/transfers').set('x-api-key', 'wk_test');
    const write3 = await request(app).post('/api/transfers').set('x-api-key', 'wk_test');
    expect(write1.status).toBe(200);
    expect(write2.status).toBe(200);
    expect(write3.status).toBe(429);
    expect(write3.body).toEqual({ error: 'Too many requests' });
  });
});
