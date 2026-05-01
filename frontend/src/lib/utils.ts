import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function createIdempotencyKey(prefix: string) {
  const random = crypto.randomUUID();
  return `${prefix}-${random}`;
}
