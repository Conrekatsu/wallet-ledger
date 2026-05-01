import request from 'supertest';

const createAccountMock = jest.fn();
const findAccountByIdMock = jest.fn();

jest.mock('../middleware/apiKeyAuth', () => ({
  apiKeyAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

jest.mock('../middleware/auth', () => ({
  authenticate: (req: any, _res: unknown, next: () => void) => {
    req.user = { userId: 'u1', email: 'u1@test.com' };
    next();
  },
}));

jest.mock('../dal', () => ({
  AccountRepository: jest.fn(() => ({
    create: createAccountMock,
    findById: findAccountByIdMock,
  })),
  TransactionRepository: jest.fn(() => ({
    findById: jest.fn(),
  })),
  UserRepository: jest.fn(() => ({
    create: jest.fn(),
    findByEmail: jest.fn(),
    findSafeById: jest.fn(),
  })),
}));

import app from '../app';

describe('accounts routes (route -> handler -> controller)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST /api/accounts creates account for authenticated user', async () => {
    createAccountMock.mockResolvedValue({
      id: 'acc_1',
      userId: 'u1',
      balance: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    const res = await request(app).post('/api/accounts').send({});

    expect(res.status).toBe(201);
    expect(res.body.account.id).toBe('acc_1');
    expect(createAccountMock).toHaveBeenCalledWith({ userId: 'u1' });
  });

  it('GET /api/accounts/:id/balance returns 404 when account does not exist', async () => {
    findAccountByIdMock.mockResolvedValue(null);

    const res = await request(app).get('/api/accounts/acc_missing/balance');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Account not found');
  });

  it('GET /api/accounts/:id/balance returns 403 for non-owner', async () => {
    findAccountByIdMock.mockResolvedValue({ id: 'acc_2', userId: 'other-user', balance: 90 });

    const res = await request(app).get('/api/accounts/acc_2/balance');

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden');
  });

  it('GET /api/accounts/:id/balance returns balance for owner', async () => {
    findAccountByIdMock.mockResolvedValue({ id: 'acc_1', userId: 'u1', balance: 250 });

    const res = await request(app).get('/api/accounts/acc_1/balance');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ accountId: 'acc_1', balance: 250 });
  });
});
