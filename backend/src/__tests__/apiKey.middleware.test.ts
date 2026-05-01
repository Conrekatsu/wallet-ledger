import { NextFunction, Request, Response } from 'express';
const findSafeByApiKeyMock = jest.fn();

jest.mock('../dal', () => ({
  UserRepository: jest.fn(() => ({ findSafeByApiKey: findSafeByApiKeyMock })),
}));

const { apiKeyAuth } = require('../middleware/apiKeyAuth');

function makeRes(): { res: Response; status: jest.Mock; json: jest.Mock } {
  const status = jest.fn().mockReturnThis();
  const json = jest.fn().mockReturnThis();
  return { res: { status, json } as unknown as Response, status, json };
}

describe('apiKeyAuth middleware', () => {
  const next = jest.fn() as unknown as NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows public auth/login path without api key', async () => {
    const req = { path: '/auth/login', header: jest.fn() } as unknown as Request;
    const { res } = makeRes();
    await apiKeyAuth(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('returns 401 when missing x-api-key on protected route', async () => {
    const req = { path: '/accounts', header: jest.fn().mockReturnValue(undefined) } as unknown as Request;
    const { res, status } = makeRes();
    await apiKeyAuth(req, res, next);
    expect(status).toHaveBeenCalledWith(401);
  });

  it('returns 401 when api key is unknown', async () => {
    const key = 'wk_unknown';
    findSafeByApiKeyMock.mockResolvedValue(null);
    const req = { path: '/accounts', header: jest.fn().mockReturnValue(key) } as unknown as Request;
    const { res, status } = makeRes();
    await apiKeyAuth(req, res, next);
    expect(status).toHaveBeenCalledWith(401);
    expect(findSafeByApiKeyMock).toHaveBeenCalledWith(key);
  });

  it('attaches request user when api key is valid', async () => {
    const key = 'wk_valid';
    findSafeByApiKeyMock.mockResolvedValue({ id: 'u1', email: 'u1@test.com', name: 'U1', createdAt: new Date() });
    const req = { path: '/accounts', header: jest.fn().mockReturnValue(key) } as unknown as Request;
    const { res } = makeRes();

    await apiKeyAuth(req, res, next);

    expect((req as any).user).toEqual({ userId: 'u1', email: 'u1@test.com' });
    expect(next).toHaveBeenCalledTimes(1);
  });
});
