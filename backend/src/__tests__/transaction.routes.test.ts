import request from 'supertest';

const moveMoneyMock = jest.fn();
const findTransferByIdMock = jest.fn();
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
    moveMoney: moveMoneyMock,
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
    moveMoneyMock.mockResolvedValue({
      transaction: { id: 'tx_1', status: 'completed', fromAccountId: 'acc_1', toAccountId: 'acc_2' },
      replayed: false,
    });

    const res = await request(app)
      .post('/api/transfers')
      .set('x-api-key', 'wk_test')
      .set('Idempotency-Key', 'idem-1')
      .send({ fromAccountId: 'acc_1', toAccountId: 'acc_2', amount: 20 });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      transfer: { id: 'tx_1', status: 'COMPLETED', fromAccountId: 'acc_1', toAccountId: 'acc_2' },
      replayed: false,
    });
  });

  it('GET /api/transfers/:id returns 404 when transfer does not exist', async () => {
    findTransferByIdMock.mockResolvedValue(null);

    const res = await request(app).get('/api/transfers/tx_missing').set('x-api-key', 'wk_test');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Something went wrong');
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
    expect(res.body.error).toBe('Something went wrong');
  });

  it('GET /api/transfers/:id returns transfer status for owner', async () => {
    findTransferByIdMock.mockResolvedValue({
      id: 'tx_3',
      fromAccountId: 'acc_1',
      status: 'completed',
    });
    findAccountByIdMock.mockResolvedValue({ id: 'acc_1', userId: 'u1' });

    const res = await request(app).get('/api/transfers/tx_3').set('x-api-key', 'wk_test');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 'tx_3', status: 'COMPLETED' });
  });
});
