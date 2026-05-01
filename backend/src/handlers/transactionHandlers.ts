import { NextFunction, Request, Response } from 'express';
import * as transactionController from '../controllers/transactionController';

export async function createTransferHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await transactionController.createTransfer({
      ...req.body,
      requesterUserId: req.user?.userId,
      idempotencyKey: req.header('Idempotency-Key') ?? undefined,
    });
    res.status(result.replayed ? 200 : 201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getTransferStatusHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await transactionController.getTransferStatus({
      requesterUserId: req.user?.userId,
      transferId: req.params.id,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function listDeadLetterTransfersHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await transactionController.listDeadLetterTransfers({
      requesterUserId: req.user?.userId,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function retryDeadLetterTransferHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await transactionController.retryDeadLetterTransfer({
      requesterUserId: req.user?.userId,
      transferId: req.params.id,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}
