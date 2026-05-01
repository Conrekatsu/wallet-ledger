import pool from '../../db/pool';
import { Queryable } from '../types';

export class AuditLogRepository {
  constructor(private readonly db: Queryable = pool) {}

  async recordTransferEvent(input: {
    actorUserId?: string;
    transferId: string;
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    action: 'TransferRequested' | 'TransferProcessing' | 'TransferCompleted' | 'TransferFailed';
    status: 'pending' | 'processing' | 'completed' | 'failed';
    reason?: string;
    retryCount?: number;
  }): Promise<void> {
    await this.db.query(
      `INSERT INTO audit_logs (actor_user_id, account_id, transfer_id, action, metadata)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [
        input.actorUserId ?? null,
        input.fromAccountId,
        input.transferId,
        input.action,
        JSON.stringify({
          status: input.status,
          fromAccountId: input.fromAccountId,
          toAccountId: input.toAccountId,
          amount: input.amount,
          ...(input.reason ? { reason: input.reason } : {}),
          ...(input.retryCount !== undefined ? { retryCount: input.retryCount } : {}),
          timestamp: new Date().toISOString(),
        }),
      ]
    );
  }

  async recordTransfer(input: {
    actorUserId: string;
    transferId: string;
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    replayed: boolean;
  }): Promise<void> {
    if (input.replayed) {
      return;
    }

    await this.recordTransferEvent({
      actorUserId: input.actorUserId,
      transferId: input.transferId,
      fromAccountId: input.fromAccountId,
      toAccountId: input.toAccountId,
      amount: input.amount,
      action: 'TransferCompleted',
      status: 'completed',
    });
  }
}
