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
  idempotency_key: string;
  created_at: Date;
  updated_at: Date;
};

export class TransactionRepository {
  constructor(private readonly db: Queryable = pool) {}

  async create(input: CreateTransactionInput): Promise<SerializedTransaction> {
    try {
      const result = await this.db.query<TransactionRow>(
        `INSERT INTO transfers (from_account_id, to_account_id, amount, idempotency_key)
         VALUES ($1, $2, $3, $4)
         RETURNING id, from_account_id, to_account_id, amount, status, idempotency_key, created_at, updated_at`,
        [input.fromAccountId, input.toAccountId, input.amount, input.idempotencyKey]
      );

      return Transaction.fromRow(result.rows[0]).serialize();
    } catch (error) {
      throw error;
    }
  }

  async updateStatus(id: string, status: TransactionStatus): Promise<SerializedTransaction | null> {
    try {
      const result = await this.db.query<TransactionRow>(
        `UPDATE transfers
         SET status = $2, updated_at = NOW()
         WHERE id = $1
         RETURNING id, from_account_id, to_account_id, amount, status, idempotency_key, created_at, updated_at`,
        [id, status]
      );

      return result.rows[0] ? Transaction.fromRow(result.rows[0]).serialize() : null;
    } catch (error) {
      throw error;
    }
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<SerializedTransaction | null> {
    try {
      const result = await this.db.query<TransactionRow>(
        `SELECT id, from_account_id, to_account_id, amount, status, idempotency_key, created_at, updated_at
         FROM transfers
         WHERE idempotency_key = $1`,
        [idempotencyKey]
      );

      return result.rows[0] ? Transaction.fromRow(result.rows[0]).serialize() : null;
    } catch (error) {
      throw error;
    }
  }

  async findById(id: string): Promise<SerializedTransaction | null> {
    try {
      const result = await this.db.query<TransactionRow>(
        `SELECT id, from_account_id, to_account_id, amount, status, idempotency_key, created_at, updated_at
         FROM transfers
         WHERE id = $1`,
        [id]
      );

      return result.rows[0] ? Transaction.fromRow(result.rows[0]).serialize() : null;
    } catch (error) {
      throw error;
    }
  }
}
