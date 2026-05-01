import { NextFunction, Request, Response } from 'express';
import crypto from 'crypto';
import { UserRepository } from '../dal';

const API_KEY_HEADER = 'x-api-key';
const PUBLIC_API_PATHS = new Set(['/auth/register', '/auth/login', '/health']);
const users = new UserRepository();

export async function apiKeyAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (PUBLIC_API_PATHS.has(req.path)) {
      next();
      return;
    }

    const receivedKey = req.header(API_KEY_HEADER);
    if (!receivedKey) {
      res.status(401).json({ error: 'Missing or invalid API key' });
      return;
    }

    const hashedKey = hashApiKey(receivedKey);
    const user = await users.findSafeByApiKey(hashedKey);
    if (!user) {
      res.status(401).json({ error: 'Missing or invalid API key' });
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
}

function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}
