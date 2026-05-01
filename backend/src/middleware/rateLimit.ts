import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { Request } from 'express';
import { logger } from '../lib/logger';

function toNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function rateLimitKey(req: Request): string {
  const apiKey = req.header('x-api-key');
  if (apiKey && apiKey.trim().length > 0) {
    return `api-key:${apiKey}`;
  }

  return `ip:${ipKeyGenerator(req.ip ?? 'unknown')}`;
}

function createLimiter(options: { windowMs: number; max: number; name: string }) {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: rateLimitKey,
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        limiter: options.name,
        path: req.originalUrl,
        method: req.method,
      });
      res.status(429).json({ error: 'Too many requests' });
    },
  });
}

export function createRateLimiters(config?: {
  globalWindowMs?: number;
  globalMax?: number;
  writeWindowMs?: number;
  writeMax?: number;
}) {
  const globalWindowMs = config?.globalWindowMs ?? toNumber(process.env.RATE_LIMIT_GLOBAL_WINDOW_MS, 60_000);
  const globalMax = config?.globalMax ?? toNumber(process.env.RATE_LIMIT_GLOBAL_MAX, 120);
  const writeWindowMs = config?.writeWindowMs ?? toNumber(process.env.RATE_LIMIT_WRITE_WINDOW_MS, 60_000);
  const writeMax = config?.writeMax ?? toNumber(process.env.RATE_LIMIT_WRITE_MAX, 30);

  return {
    globalApiLimiter: createLimiter({ windowMs: globalWindowMs, max: globalMax, name: 'global' }),
    strictWriteLimiter: createLimiter({ windowMs: writeWindowMs, max: writeMax, name: 'write' }),
  };
}

const rateLimiters = createRateLimiters();
export const globalApiLimiter = rateLimiters.globalApiLimiter;
export const strictWriteLimiter = rateLimiters.strictWriteLimiter;
