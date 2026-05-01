import request from 'supertest';

const createAccountMock = jest.fn();
const findAccountByIdMock = jest.fn();
const findTransferByIdempotencyKeyMock = jest.fn();
const createTransferMock = jest.fn();
const updateTransferStatusMock = jest.fn();
const createLedgerEntryMock = jest.fn();
const findAccountTransactionsMock = jest.fn();
const findSafeByApiKeyMock = jest.fn().mockResolvedValue({ id: 'u1', email: 'u1@test.com' });

jest.mock('../middleware/apiKeyAuth', () => ({
  apiKeyAuth: (req: any, _res: unknown, next: () => void) => {
    req.user = { userId: 'u1', email: 'u1@test.com' };
    next();
  },
}));

jest.mock('../middleware/auth', () => ({
  authenticate: (req: any, _res: unknown, next: () => void) => {
    req.user = { userId: 'u1', email: 'u1@test.com' };
    next();
  },
}));

jest.mock('../dal', () => ({
  withTransaction: async (work: (client: unknown) => Promise<unknown>) => work({}),
  AccountRepository: jest.fn(() => ({
    create: createAccountMock,
    findById: findAccountByIdMock,
  })),
  TransactionRepository: jest.fn(() => ({
    findById: jest.fn(),
    findByIdempotencyKey: findTransferByIdempotencyKeyMock,
    create: createTransferMock,
    markCompleted: updateTransferStatusMock,
  })),
  LedgerRepository: jest.fn(() => ({
    create: createLedgerEntryMock,
    findAccountTransactions: findAccountTransactionsMock,
  })),
  UserRepository: jest.fn(() => ({
    create: jest.fn(),
    findByEmail: jest.fn(),
    findSafeById: jest.fn(),
    findSafeByApiKey: findSafeByApiKeyMock,
  })),
  AuditLogRepository: jest.fn(() => ({
    listForUser: jest.fn(),
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

    const res = await request(app).post('/api/accounts').set('x-api-key', 'wk_test').send({});

    expect(res.status).toBe(201);
    expect(res.body.account.id).toBe('acc_1');
    expect(createAccountMock).toHaveBeenCalledWith({ userId: 'u1' });
  });

  it('GET /api/accounts/:id/balance returns 404 when account does not exist', async () => {
    findAccountByIdMock.mockResolvedValue(null);

    const res = await request(app).get('/api/accounts/acc_missing/balance').set('x-api-key', 'wk_test');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Account not found');
  });

  it('GET /api/accounts/:id/balance returns 403 for non-owner', async () => {
    findAccountByIdMock.mockResolvedValue({ id: 'acc_2', userId: 'other-user', balance: 90 });

    const res = await request(app).get('/api/accounts/acc_2/balance').set('x-api-key', 'wk_test');

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden');
  });

  it('GET /api/accounts/:id/balance returns balance for owner', async () => {
    findAccountByIdMock.mockResolvedValue({ id: 'acc_1', userId: 'u1', balance: 250 });

    const res = await request(app).get('/api/accounts/acc_1/balance').set('x-api-key', 'wk_test');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ accountId: 'acc_1', balance: 250 });
  });

  it('POST /api/accounts/:id/funds returns 400 when Idempotency-Key is missing', async () => {
    const res = await request(app).post('/api/accounts/acc_1/funds').set('x-api-key', 'wk_test').send({ amount: 50 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Idempotency-Key header required');
  });

  it('POST /api/accounts/:id/funds credits account and returns updated balance', async () => {
    findAccountByIdMock
      .mockResolvedValueOnce({ id: 'acc_1', userId: 'u1', balance: 250 })
      .mockResolvedValueOnce({ id: 'acc_1', userId: 'u1', balance: 300 });
    findTransferByIdempotencyKeyMock.mockResolvedValue(null);
    createTransferMock.mockResolvedValue({
      id: 'tx_fund_1',
      fromAccountId: 'acc_1',
      toAccountId: 'acc_1',
      amount: 50,
      status: 'pending',
      idempotencyKey: 'fund-1',
    });
    updateTransferStatusMock.mockResolvedValue({
      id: 'tx_fund_1',
      fromAccountId: 'acc_1',
      toAccountId: 'acc_1',
      amount: 50,
      status: 'completed',
      idempotencyKey: 'fund-1',
    });
    createLedgerEntryMock.mockResolvedValue({
      id: 'le_1',
      accountId: 'acc_1',
      transferId: 'tx_fund_1',
      amount: 50,
      type: 'credit',
    });

    const res = await request(app)
      .post('/api/accounts/acc_1/funds')
      .set('x-api-key', 'wk_test')
      .set('Idempotency-Key', 'fund-1')
      .send({ amount: 50 });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      transfer: expect.objectContaining({ id: 'tx_fund_1', status: 'COMPLETED' }),
      accountId: 'acc_1',
      balance: 300,
      replayed: false,
    });
  });

  it('GET /api/accounts/:id/transactions returns account ledger history for owner', async () => {
    findAccountByIdMock.mockResolvedValue({ id: 'acc_1', userId: 'u1', balance: 250 });
    findAccountTransactionsMock.mockResolvedValue([
      {
        id: 'le_1',
        transferId: 'tx_1',
        type: 'credit',
        amount: 50,
        timestamp: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'le_2',
        transferId: 'tx_2',
        type: 'debit',
        amount: -25,
        timestamp: '2026-01-02T00:00:00.000Z',
      },
    ]);

    const res = await request(app).get('/api/accounts/acc_1/transactions').set('x-api-key', 'wk_test');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      accountId: 'acc_1',
      transactions: expect.arrayContaining([
        expect.objectContaining({ transferId: 'tx_1', type: 'credit' }),
        expect.objectContaining({ transferId: 'tx_2', type: 'debit' }),
      ]),
    });
  });

  it('GET /api/accounts/:id/transactions returns 403 for non-owner', async () => {
    findAccountByIdMock.mockResolvedValue({ id: 'acc_2', userId: 'other-user', balance: 90 });

    const res = await request(app).get('/api/accounts/acc_2/transactions').set('x-api-key', 'wk_test');

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden');
  });
});
