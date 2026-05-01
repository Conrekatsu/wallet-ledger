import pool from '../../db/pool';
import { Queryable } from '../types';

export class AuditLogRepository {
  constructor(private readonly db: Queryable = pool) {}

  async recordTransfer(input: {
    actorUserId: string;
    transferId: string;
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    replayed: boolean;
  }): Promise<void> {
    await this.db.query(
      `INSERT INTO audit_logs (actor_user_id, account_id, transfer_id, action, metadata)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [
        input.actorUserId,
        input.fromAccountId,
        input.transferId,
        input.replayed ? 'transfer.replayed' : 'transfer.completed',
        JSON.stringify({
          fromAccountId: input.fromAccountId,
          toAccountId: input.toAccountId,
          amount: input.amount,
        }),
      ]
    );
  }
}
