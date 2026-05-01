import { NextFunction, Request, Response } from 'express';
import * as accountController from '../controllers/accountController';

export async function createAccountHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await accountController.createAccount({
      requesterUserId: req.user?.userId,
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getAccountBalanceHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await accountController.getAccountBalance({
      requesterUserId: req.user?.userId,
      accountId: req.params.id,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function addFundsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await accountController.addFunds({
      requesterUserId: req.user?.userId,
      accountId: req.params.id,
      amount: req.body?.amount,
      idempotencyKey: req.header('Idempotency-Key') ?? undefined,
    });
    res.status(result.replayed ? 200 : 201).json(result);
  } catch (err) {
    next(err);
  }
}
