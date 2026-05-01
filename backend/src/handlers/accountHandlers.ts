import { Request, Response } from 'express';
import * as accountController from '../controllers/accountController';

export async function createAccountHandler(req: Request, res: Response): Promise<void> {
  try {
    const result = await accountController.createAccount({
      requesterUserId: req.user?.userId,
    });
    res.status(201).json(result);
  } catch (err: any) {
    if (err.message === 'Unauthorized') {
      res.status(401).json({ error: err.message });
      return;
    }

    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getAccountBalanceHandler(req: Request, res: Response): Promise<void> {
  try {
    const result = await accountController.getAccountBalance({
      requesterUserId: req.user?.userId,
      accountId: req.params.id,
    });
    res.json(result);
  } catch (err: any) {
    if (err.message === 'Unauthorized') {
      res.status(401).json({ error: err.message });
      return;
    }
    if (err.message === 'accountId required') {
      res.status(400).json({ error: err.message });
      return;
    }
    if (err.message === 'Account not found') {
      res.status(404).json({ error: err.message });
      return;
    }
    if (err.message === 'Forbidden') {
      res.status(403).json({ error: err.message });
      return;
    }

    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
