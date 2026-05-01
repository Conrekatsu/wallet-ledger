import pool from '../../db/pool';
import { Queryable } from '../types';

export type AuditLogListRow = {
  id: string;
  actorUserId: string | null;
  accountId: string | null;
  transferId: string | null;
  action: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

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

  /**
   * Audit rows visible to a user: transfer touches one of their accounts, or row.account_id is theirs.
   * Optional accountId narrows to events involving that account (must belong to user — caller validates).
   */
  async listForUser(userId: string, accountId?: string | null): Promise<AuditLogListRow[]> {
    const params: unknown[] = [userId];
    let accountClause = '';
    if (accountId) {
      params.push(accountId);
      accountClause = ` AND (
        al.account_id = $2::uuid
        OR EXISTS (
          SELECT 1 FROM transfers trf
          WHERE trf.id = al.transfer_id
          AND $2::uuid IN (trf.from_account_id, trf.to_account_id)
        )
      )`;
    }

    const result = await this.db.query<{
      id: string;
      actor_user_id: string | null;
      account_id: string | null;
      transfer_id: string | null;
      action: string;
      metadata: Record<string, unknown>;
      created_at: Date;
    }>(
      `SELECT al.id, al.actor_user_id, al.account_id, al.transfer_id, al.action, al.metadata, al.created_at
       FROM audit_logs al
       WHERE (
         EXISTS (
           SELECT 1 FROM transfers tr
           INNER JOIN accounts acc ON acc.id IN (tr.from_account_id, tr.to_account_id)
           WHERE tr.id = al.transfer_id AND acc.user_id = $1::uuid
         )
         OR EXISTS (
           SELECT 1 FROM accounts acc2
           WHERE acc2.id = al.account_id AND acc2.user_id = $1::uuid
         )
       )
       ${accountClause}
       ORDER BY al.created_at DESC
       LIMIT 500`,
      params
    );

    return result.rows.map((row) => ({
      id: row.id,
      actorUserId: row.actor_user_id,
      accountId: row.account_id,
      transferId: row.transfer_id,
      action: row.action,
      metadata: row.metadata ?? {},
      createdAt: row.created_at.toISOString(),
    }));
  }
}
