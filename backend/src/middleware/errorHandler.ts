import { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/appError';
import { logger } from '../lib/logger';

const GENERIC_ERROR_MESSAGE = 'Something went wrong';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  logger.error('Request failed with unhandled exception', err);
  if (hasCode(err, '23505')) {
    res.status(409).json({ error: 'Resource already exists' });
    return;
  }
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const error = statusCode < 500 ? getErrorPayload(err, GENERIC_ERROR_MESSAGE) : GENERIC_ERROR_MESSAGE;
  res.status(statusCode).json({ error });
}

function hasCode(err: unknown, expectedCode: string): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === expectedCode;
}

function getErrorPayload(err: unknown, fallback: string): unknown {
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === 'string' || typeof err === 'number' || typeof err === 'boolean') {
    return err;
  }
  return fallback;
}
