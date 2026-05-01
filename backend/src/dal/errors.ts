import { AppError } from '../lib/appError';

type ErrorWithCode = Error & { code?: string };

export class DalError extends Error {
  readonly repository: string;
  readonly operation: string;
  readonly code?: string;
  readonly cause?: unknown;

  constructor(params: {
    repository: string;
    operation: string;
    message?: string;
    code?: string;
    cause?: unknown;
  }) {
    super(params.message ?? `DAL operation failed: ${params.repository}.${params.operation}`);
    this.name = 'DalError';
    this.repository = params.repository;
    this.operation = params.operation;
    this.code = params.code;
    this.cause = params.cause;
  }
}

export function toDalError(error: unknown, repository: string, operation: string): DalError {
  if (error instanceof DalError) {
    return error;
  }

  const pgCode =
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as ErrorWithCode).code === 'string'
      ? (error as ErrorWithCode).code
      : undefined;

  return new DalError({
    repository,
    operation,
    code: pgCode,
    cause: error,
  });
}

export async function withDalError<T>(
  repository: string,
  operation: string,
  work: () => Promise<T>
): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw toDalError(error, repository, operation);
  }
}
