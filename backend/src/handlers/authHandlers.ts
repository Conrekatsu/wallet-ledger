import { Request, Response } from 'express';
import * as authController from '../controllers/authController';

export async function registerHandler(req: Request, res: Response): Promise<void> {
  try {
    const result = await authController.register(req.body);
    res.status(201).json(result);
  } catch (err: any) {
    if (err.message === 'email and password required') {
      res.status(400).json({ error: err.message });
      return;
    }
    if (err.code === '23505') {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function loginHandler(req: Request, res: Response): Promise<void> {
  try {
    const result = await authController.login(req.body);
    res.json(result);
  } catch (err: any) {
    if (err.message === 'email and password required') {
      res.status(400).json({ error: err.message });
      return;
    }
    if (err.message === 'Invalid credentials') {
      res.status(401).json({ error: err.message });
      return;
    }

    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function meHandler(req: Request, res: Response): Promise<void> {
  try {
    const result = await authController.me(String(req.user!.userId));
    res.json(result);
  } catch (err: any) {
    if (err.message === 'User not found') {
      res.status(404).json({ error: err.message });
      return;
    }

    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
