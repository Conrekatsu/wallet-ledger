import pool from '../../db/pool';
import {
  CreateTransactionInput,
  SerializedTransaction,
  TransactionStatus,
  Transaction,
} from '../../models/Transaction';
import { Queryable } from '../types';

type TransactionRow = {
  id: string;
  from_account_id: string;
  to_account_id: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  last_error: string | null;
  idempotency_key: string;
  created_at: Date;
  updated_at: Date;
};

export interface ClaimedTransfer {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  retryCount: number;
}

export class TransactionRepository {
  constructor(private readonly db: Queryable = pool) {}

  async create(input: CreateTransactionInput): Promise<SerializedTransaction> {
    const result = await this.db.query<TransactionRow>(
      `INSERT INTO transfers (from_account_id, to_account_id, amount, idempotency_key)
       VALUES ($1, $2, $3, $4)
       RETURNING id, from_account_id, to_account_id, amount, status, last_error, idempotency_key, created_at, updated_at`,
      [input.fromAccountId, input.toAccountId, input.amount, input.idempotencyKey]
    );

    return Transaction.fromRow(result.rows[0]).serialize();
  }

  async updateStatus(id: string, status: TransactionStatus): Promise<SerializedTransaction | null> {
    const result = await this.db.query<TransactionRow>(
      `UPDATE transfers
       SET status = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING id, from_account_id, to_account_id, amount, status, last_error, idempotency_key, created_at, updated_at`,
      [id, status]
    );

    return result.rows[0] ? Transaction.fromRow(result.rows[0]).serialize() : null;
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<SerializedTransaction | null> {
    const result = await this.db.query<TransactionRow>(
      `SELECT id, from_account_id, to_account_id, amount, status, last_error, idempotency_key, created_at, updated_at
       FROM transfers
       WHERE idempotency_key = $1`,
      [idempotencyKey]
    );

    return result.rows[0] ? Transaction.fromRow(result.rows[0]).serialize() : null;
  }

  async findById(id: string): Promise<SerializedTransaction | null> {
    const result = await this.db.query<TransactionRow>(
      `SELECT id, from_account_id, to_account_id, amount, status, last_error, idempotency_key, created_at, updated_at
       FROM transfers
       WHERE id = $1`,
      [id]
    );

    return result.rows[0] ? Transaction.fromRow(result.rows[0]).serialize() : null;
  }

  async findByIdForUpdate(id: string): Promise<SerializedTransaction | null> {
    const result = await this.db.query<TransactionRow>(
      `SELECT id, from_account_id, to_account_id, amount, status, last_error, idempotency_key, created_at, updated_at
       FROM transfers
       WHERE id = $1
       FOR UPDATE`,
      [id]
    );

    return result.rows[0] ? Transaction.fromRow(result.rows[0]).serialize() : null;
  }

  async claimNextPendingForProcessing(
    now: Date = new Date(),
    staleProcessingBefore?: Date
  ): Promise<ClaimedTransfer | null> {
    const staleBefore = staleProcessingBefore ?? new Date(now.getTime() - 60_000);
    const result = await this.db.query<{
      id: string;
      from_account_id: string;
      to_account_id: string;
      amount: number;
      retry_count: number;
    }>(
      `WITH candidate AS (
         SELECT id
         FROM transfers
         WHERE (
           status = 'pending'
           AND (next_retry_at IS NULL OR next_retry_at <= $1)
         ) OR (
           status = 'processing'
           AND updated_at < $2
         )
         ORDER BY
           CASE WHEN status = 'pending' THEN 0 ELSE 1 END,
           created_at ASC,
           updated_at ASC
         FOR UPDATE SKIP LOCKED
         LIMIT 1
       )
       UPDATE transfers t
       SET status = 'processing',
           processing_started_at = NOW(),
           next_retry_at = NULL,
           updated_at = NOW()
       FROM candidate
       WHERE t.id = candidate.id
       RETURNING t.id, t.from_account_id, t.to_account_id, t.amount, t.retry_count`,
      [now, staleBefore]
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      fromAccountId: row.from_account_id,
      toAccountId: row.to_account_id,
      amount: row.amount,
      retryCount: row.retry_count,
    };
  }

  async markCompleted(id: string): Promise<SerializedTransaction | null> {
    const result = await this.db.query<TransactionRow>(
      `UPDATE transfers
       SET status = 'completed',
           completed_at = NOW(),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, from_account_id, to_account_id, amount, status, last_error, idempotency_key, created_at, updated_at`,
      [id]
    );

    return result.rows[0] ? Transaction.fromRow(result.rows[0]).serialize() : null;
  }

  async markFailed(id: string, reason: string): Promise<SerializedTransaction | null> {
    const result = await this.db.query<TransactionRow>(
      `UPDATE transfers
       SET status = 'failed',
           failed_at = NOW(),
           last_error = $2,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, from_account_id, to_account_id, amount, status, last_error, idempotency_key, created_at, updated_at`,
      [id, reason]
    );

    return result.rows[0] ? Transaction.fromRow(result.rows[0]).serialize() : null;
  }

  async requeueWithBackoff(
    id: string,
    retryCount: number,
    nextRetryAt: Date,
    reason: string
  ): Promise<SerializedTransaction | null> {
    const result = await this.db.query<TransactionRow>(
      `UPDATE transfers
       SET status = 'pending',
           retry_count = $2,
           next_retry_at = $3,
           processing_started_at = NULL,
           last_error = $4,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, from_account_id, to_account_id, amount, status, last_error, idempotency_key, created_at, updated_at`,
      [id, retryCount, nextRetryAt, reason]
    );

    return result.rows[0] ? Transaction.fromRow(result.rows[0]).serialize() : null;
  }

  async findFailedByUserId(userId: string): Promise<SerializedTransaction[]> {
    const result = await this.db.query<TransactionRow>(
      `SELECT t.id, t.from_account_id, t.to_account_id, t.amount, t.status, t.last_error, t.idempotency_key, t.created_at, t.updated_at
       FROM transfers t
       INNER JOIN accounts a ON a.id = t.from_account_id
       WHERE t.status = 'failed' AND a.user_id = $1
       ORDER BY t.updated_at DESC`,
      [userId]
    );

    return result.rows.map((row) => Transaction.fromRow(row).serialize());
  }

  async requeueFailedTransfer(id: string): Promise<SerializedTransaction | null> {
    const result = await this.db.query<TransactionRow>(
      `UPDATE transfers
       SET status = 'pending',
           retry_count = retry_count + 1,
           next_retry_at = NULL,
           processing_started_at = NULL,
           last_error = NULL,
           updated_at = NOW()
       WHERE id = $1 AND status = 'failed'
       RETURNING id, from_account_id, to_account_id, amount, status, last_error, idempotency_key, created_at, updated_at`,
      [id]
    );

    return result.rows[0] ? Transaction.fromRow(result.rows[0]).serialize() : null;
  }
}
