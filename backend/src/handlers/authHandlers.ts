import { NextFunction, Request, Response } from 'express';
import * as authController from '../controllers/authController';

export async function registerHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authController.register(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function loginHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authController.login(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function userHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authController.user(String(req.user!.userId));
    res.json(result);
  } catch (err) {
    next(err);
  }
}
