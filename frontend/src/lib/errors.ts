import { isAxiosError } from 'axios';

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (isAxiosError<{ error?: string }>(error)) {
    return error.response?.data?.error ?? fallback;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}
