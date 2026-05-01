import { authenticate } from '../middleware/auth';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

function makeReq(authHeader?: string): Request {
  return { headers: { authorization: authHeader } } as unknown as Request;
}

function makeRes(): { res: Response; status: jest.Mock; json: jest.Mock } {
  const status = jest.fn().mockReturnThis();
  const json = jest.fn().mockReturnThis();
  return { res: { status, json } as unknown as Response, status, json };
}

const mockNext = jest.fn() as unknown as NextFunction;

beforeEach(() => jest.clearAllMocks());

describe('authenticate middleware', () => {
  it('sets req.user and calls next for a valid token', () => {
    const token = jwt.sign({ userId: 1, email: 'a@b.com' }, process.env.JWT_SECRET!);
    const req = makeReq(`Bearer ${token}`);
    const { res } = makeRes();

    authenticate(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(req.user).toMatchObject({ userId: 1, email: 'a@b.com' });
  });

  it('returns 401 when Authorization header is absent', () => {
    const req = makeReq();
    const { res, status, json } = makeRes();

    authenticate(req, res, mockNext);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('returns 401 when header does not start with "Bearer "', () => {
    const req = makeReq('Token abc123');
    const { res, status } = makeRes();

    authenticate(req, res, mockNext);

    expect(status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('returns 401 for a malformed token', () => {
    const req = makeReq('Bearer not.a.valid.token');
    const { res, status } = makeRes();

    authenticate(req, res, mockNext);

    expect(status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('returns 401 for a token signed with the wrong secret', () => {
    const token = jwt.sign({ userId: 1, email: 'a@b.com' }, 'wrong-secret');
    const req = makeReq(`Bearer ${token}`);
    const { res, status } = makeRes();

    authenticate(req, res, mockNext);

    expect(status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('returns 401 for an expired token', () => {
    const token = jwt.sign({ userId: 1, email: 'a@b.com' }, process.env.JWT_SECRET!, { expiresIn: -1 });
    const req = makeReq(`Bearer ${token}`);
    const { res, status } = makeRes();

    authenticate(req, res, mockNext);

    expect(status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });
});
