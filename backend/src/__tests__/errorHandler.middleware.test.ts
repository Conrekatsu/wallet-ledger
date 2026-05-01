import { Request, Response } from 'express';
import { errorHandler } from '../middleware/errorHandler';

function makeRes(): { res: Response; status: jest.Mock; json: jest.Mock } {
  const status = jest.fn().mockReturnThis();
  const json = jest.fn().mockReturnThis();
  return { res: { status, json } as unknown as Response, status, json };
}

describe('errorHandler middleware', () => {
  it('serializes Error instances with their message', () => {
    const { res, status, json } = makeRes();
    errorHandler(new Error('boom'), {} as Request, res, jest.fn());
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ error: 'boom' });
  });

  it('falls back to generic message for non-error values', () => {
    const { res, status, json } = makeRes();
    errorHandler('not-an-error', {} as Request, res, jest.fn());
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ error: 'Internal server error' });
  });
});
