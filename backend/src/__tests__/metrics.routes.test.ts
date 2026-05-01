import request from 'supertest';

jest.mock('../middleware/apiKeyAuth', () => ({
  apiKeyAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

import app from '../app';
import { getMetricsSnapshot } from '../lib/metrics';

describe('metrics route', () => {
  it('GET /api/metrics returns lifecycle metrics snapshot', async () => {
    const res = await request(app).get('/api/metrics');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(getMetricsSnapshot());
    expect(res.body).toHaveProperty('transferRequestedTotal');
    expect(res.body).toHaveProperty('transferProcessingDurationMsAvg');
  });
});
