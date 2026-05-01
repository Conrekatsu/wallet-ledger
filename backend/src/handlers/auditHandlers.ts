import { NextFunction, Request, Response } from 'express';
import * as auditController from '../controllers/auditController';

export async function listAuditLogsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const accountId =
      typeof req.query.accountId === 'string' && req.query.accountId.trim() ? req.query.accountId.trim() : undefined;
    const result = await auditController.listAuditLogs({
      requesterUserId: req.user?.userId,
      accountId,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}
