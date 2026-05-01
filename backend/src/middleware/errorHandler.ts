import { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/appError';
import { logger } from '../lib/logger';

const GENERIC_ERROR_MESSAGE = 'Something went wrong';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  logger.error('Request failed with unhandled exception', err);
  let statusCode = err instanceof AppError ? err.statusCode : 500;
  if (hasCode(err, '23505')) {
    statusCode = 409;
  }
  res.status(statusCode).json({ error: GENERIC_ERROR_MESSAGE });
}

function hasCode(err: unknown, expectedCode: string): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === expectedCode;
}
