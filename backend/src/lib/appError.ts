export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function asAppError(statusCode: number, message: string): AppError {
  return new AppError(statusCode, message);
}
