import request from 'supertest';

const enqueueTransferMock = jest.fn();
const findTransferByIdMock = jest.fn();
const findFailedByUserIdMock = jest.fn();
const findByIdForUpdateMock = jest.fn();
const requeueFailedTransferMock = jest.fn();
const findAccountByIdMock = jest.fn();
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
  AccountRepository: jest.fn(() => ({
    findById: findAccountByIdMock,
  })),
  TransactionRepository: jest.fn(() => ({
    findById: findTransferByIdMock,
    findFailedByUserId: findFailedByUserIdMock,
    findByIdForUpdate: findByIdForUpdateMock,
    requeueFailedTransfer: requeueFailedTransferMock,
  })),
  withTransaction: async (work: (client: unknown) => Promise<unknown>) => work({}),
  AuditLogRepository: jest.fn(() => ({
    recordTransferEvent: jest.fn(),
  })),
  UserRepository: jest.fn(() => ({
    create: jest.fn(),
    findByEmail: jest.fn(),
    findSafeById: jest.fn(),
    findSafeByApiKey: findSafeByApiKeyMock,
  })),
}));

jest.mock('../services/MoneyMovementService', () => ({
  MoneyMovementService: jest.fn(() => ({
    enqueueTransfer: enqueueTransferMock,
  })),
}));

import app from '../app';

describe('transfer routes (route -> handler -> controller)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST /api/transfers returns 400 when Idempotency-Key header is missing', async () => {
    const res = await request(app)
      .post('/api/transfers')
      .set('x-api-key', 'wk_test')
      .send({ fromAccountId: 'acc_1', toAccountId: 'acc_2', amount: 20 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Idempotency-Key header required');
  });

  it('POST /api/transfers creates transfer and uppercases status', async () => {
    enqueueTransferMock.mockResolvedValue({
      transaction: { id: 'tx_1', status: 'pending', fromAccountId: 'acc_1', toAccountId: 'acc_2' },
      replayed: false,
    });

    const res = await request(app)
      .post('/api/transfers')
      .set('x-api-key', 'wk_test')
      .set('Idempotency-Key', 'idem-1')
      .send({ fromAccountId: 'acc_1', toAccountId: 'acc_2', amount: 20 });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      transfer: { id: 'tx_1', status: 'PENDING', fromAccountId: 'acc_1', toAccountId: 'acc_2' },
      replayed: false,
    });
  });

  it('POST /api/transfers replays duplicate idempotency key request', async () => {
    enqueueTransferMock.mockResolvedValue({
      transaction: { id: 'tx_1', status: 'processing', fromAccountId: 'acc_1', toAccountId: 'acc_2' },
      replayed: true,
    });

    const res = await request(app)
      .post('/api/transfers')
      .set('x-api-key', 'wk_test')
      .set('Idempotency-Key', 'idem-1')
      .send({ fromAccountId: 'acc_1', toAccountId: 'acc_2', amount: 20 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      transfer: { id: 'tx_1', status: 'PROCESSING', fromAccountId: 'acc_1', toAccountId: 'acc_2' },
      replayed: true,
    });
  });

  it('GET /api/transfers/:id returns 404 when transfer does not exist', async () => {
    findTransferByIdMock.mockResolvedValue(null);

    const res = await request(app).get('/api/transfers/tx_missing').set('x-api-key', 'wk_test');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Transfer not found');
  });

  it('GET /api/transfers/:id returns 403 for non-owner', async () => {
    findTransferByIdMock.mockResolvedValue({
      id: 'tx_2',
      fromAccountId: 'acc_foreign',
      status: 'pending',
    });
    findAccountByIdMock.mockResolvedValue({ id: 'acc_foreign', userId: 'other-user' });

    const res = await request(app).get('/api/transfers/tx_2').set('x-api-key', 'wk_test');

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden');
  });

  it('GET /api/transfers/:id returns transfer status for owner', async () => {
    findTransferByIdMock.mockResolvedValue({
      id: 'tx_3',
      fromAccountId: 'acc_1',
      status: 'completed',
      lastError: null,
    });
    findAccountByIdMock.mockResolvedValue({ id: 'acc_1', userId: 'u1' });

    const res = await request(app).get('/api/transfers/tx_3').set('x-api-key', 'wk_test');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 'tx_3', status: 'COMPLETED', failureReason: null });
  });

  it('GET /api/transfers/:id includes failure reason when failed', async () => {
    findTransferByIdMock.mockResolvedValue({
      id: 'tx_4',
      fromAccountId: 'acc_1',
      status: 'failed',
      lastError: 'Insufficient funds',
    });
    findAccountByIdMock.mockResolvedValue({ id: 'acc_1', userId: 'u1' });

    const res = await request(app).get('/api/transfers/tx_4').set('x-api-key', 'wk_test');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 'tx_4', status: 'FAILED', failureReason: 'Insufficient funds' });
  });

  it('GET /api/transfers/dead-letter lists failed transfers for requester', async () => {
    findFailedByUserIdMock.mockResolvedValue([
      {
        id: 'tx_dlq_1',
        fromAccountId: 'acc_1',
        toAccountId: 'acc_2',
        amount: 20,
        status: 'failed',
        lastError: 'Insufficient funds',
      },
    ]);

    const res = await request(app).get('/api/transfers/dead-letter').set('x-api-key', 'wk_test');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      transfers: [expect.objectContaining({ id: 'tx_dlq_1', status: 'FAILED' })],
    });
    expect(findFailedByUserIdMock).toHaveBeenCalledWith('u1');
  });

  it('POST /api/transfers/:id/retry requeues failed transfer for owner', async () => {
    findByIdForUpdateMock.mockResolvedValue({
      id: 'tx_dlq_2',
      fromAccountId: 'acc_1',
      toAccountId: 'acc_2',
      amount: 20,
      status: 'failed',
      lastError: 'Insufficient funds',
    });
    findAccountByIdMock.mockResolvedValue({ id: 'acc_1', userId: 'u1' });
    requeueFailedTransferMock.mockResolvedValue({
      id: 'tx_dlq_2',
      fromAccountId: 'acc_1',
      toAccountId: 'acc_2',
      amount: 20,
      status: 'pending',
      lastError: null,
    });

    const res = await request(app).post('/api/transfers/tx_dlq_2/retry').set('x-api-key', 'wk_test');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      transfer: expect.objectContaining({ id: 'tx_dlq_2', status: 'PENDING' }),
    });
    expect(requeueFailedTransferMock).toHaveBeenCalledWith('tx_dlq_2');
  });

  it('POST /api/transfers/:id/retry returns 403 for non-owner', async () => {
    findByIdForUpdateMock.mockResolvedValue({
      id: 'tx_dlq_3',
      fromAccountId: 'acc_foreign',
      toAccountId: 'acc_2',
      amount: 20,
      status: 'failed',
      lastError: 'Insufficient funds',
    });
    findAccountByIdMock.mockResolvedValue({ id: 'acc_foreign', userId: 'other-user' });

    const res = await request(app).post('/api/transfers/tx_dlq_3/retry').set('x-api-key', 'wk_test');

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden');
  });
});
