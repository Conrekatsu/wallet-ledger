import { Request, Response } from 'express';
import * as transactionController from '../controllers/transactionController';

export async function moveMoneyHandler(req: Request, res: Response): Promise<void> {
  try {
    const result = await transactionController.moveMoney({
      ...req.body,
      requesterUserId: req.user?.userId,
    });
    res.status(result.replayed ? 200 : 201).json(result);
  } catch (err: any) {
    if (err.message === 'Unauthorized') {
      res.status(401).json({ error: err.message });
      return;
    }
    if (
      err.message === 'fromAccountId, toAccountId, amount, and idempotencyKey are required' ||
      err.message === 'Source and destination accounts must differ' ||
      err.message === 'Amount must be a positive integer' ||
      err.message === 'One or both accounts do not exist' ||
      err.message === 'Cannot move money from an account you do not own' ||
      err.message === 'Insufficient funds'
    ) {
      res.status(400).json({ error: err.message });
      return;
    }
    if (err.message === 'Duplicate idempotency key' || err.code === '23505') {
      res.status(409).json({ error: 'Duplicate idempotency key' });
      return;
    }
    if (err.message === 'Idempotent transaction is still in progress') {
      res.status(409).json({ error: err.message });
      return;
    }
    if (err.message === 'Idempotent transaction already failed') {
      res.status(409).json({ error: err.message });
      return;
    }

    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createTransferHandler(req: Request, res: Response): Promise<void> {
  try {
    const result = await transactionController.createTransfer({
      ...req.body,
      requesterUserId: req.user?.userId,
      idempotencyKey: req.header('Idempotency-Key') ?? undefined,
    });
    res.status(result.replayed ? 200 : 201).json(result);
  } catch (err: any) {
    if (err.message === 'Unauthorized') {
      res.status(401).json({ error: err.message });
      return;
    }
    if (
      err.message === 'Idempotency-Key header required' ||
      err.message === 'fromAccountId, toAccountId, and amount are required' ||
      err.message === 'Source and destination accounts must differ' ||
      err.message === 'Amount must be a positive integer' ||
      err.message === 'One or both accounts do not exist' ||
      err.message === 'Cannot create transfer from an account you do not own' ||
      err.message === 'Cannot move money from an account you do not own' ||
      err.message === 'Insufficient funds'
    ) {
      res.status(400).json({ error: err.message });
      return;
    }
    if (
      err.message === 'Idempotent transaction is still in progress' ||
      err.message === 'Idempotent transaction already failed'
    ) {
      res.status(409).json({ error: err.message });
      return;
    }

    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getTransferStatusHandler(req: Request, res: Response): Promise<void> {
  try {
    const result = await transactionController.getTransferStatus({
      requesterUserId: req.user?.userId,
      transferId: req.params.id,
    });
    res.json(result);
  } catch (err: any) {
    if (err.message === 'Unauthorized') {
      res.status(401).json({ error: err.message });
      return;
    }
    if (err.message === 'transferId required') {
      res.status(400).json({ error: err.message });
      return;
    }
    if (err.message === 'Transfer not found') {
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
