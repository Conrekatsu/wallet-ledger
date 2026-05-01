import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db/pool';
import { authenticate } from '../middleware/auth';

const router = Router();

// ── POST /api/auth/register ───────────────────────────────────────────────────
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { email, password, name } = req.body as {
    email?: string;
    password?: string;
    name?: string;
  };

  if (!email || !password) {
    res.status(400).json({ error: 'email and password required' });
    return;
  }

  try {
    const hashed = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id, email, name, created_at`,
      [email.toLowerCase().trim(), hashed, name ?? null]
    );
    const user = result.rows[0];
    const token = signToken(user.id, user.email);
    res.status(201).json({ token, user });
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: 'email and password required' });
    return;
  }

  try {
    const result = await pool.query(
      `SELECT id, email, name, password FROM users WHERE email = $1`,
      [email.toLowerCase().trim()]
    );
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password))) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = signToken(user.id, user.email);
    const { password: _pw, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get('/me', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT id, email, name, created_at FROM users WHERE id = $1`,
      [req.user!.userId]
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function signToken(userId: number, email: string): string {
  return jwt.sign(
    { userId, email },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' } as jwt.SignOptions
  );
}

export default router;
