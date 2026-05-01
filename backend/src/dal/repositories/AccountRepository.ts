import pool from '../../db/pool';
import { asAppError } from '../../lib/appError';
import { Account, CreateAccountInput, SerializedAccount } from '../../models/Account';
import { Queryable } from '../types';

type AccountRow = {
  id: string;
  user_id: string;
  balance: number | string;
  created_at: Date;
  updated_at: Date;
};

export class AccountRepository {
  constructor(private readonly db: Queryable = pool) {}

  async create(input: CreateAccountInput): Promise<SerializedAccount> {
    if ((input.balance ?? 0) > 0) {
      throw asAppError(400, 'Initial account balance must be created through ledger entries');
    }

    const result = await this.db.query<AccountRow>(
      `INSERT INTO accounts (user_id)
       VALUES ($1)
       RETURNING
         id,
         user_id,
         0::numeric AS balance,
         created_at,
         updated_at`,
      [input.userId]
    );

    return Account.fromRow(result.rows[0]).serialize();
  }

  async findById(id: string): Promise<SerializedAccount | null> {
    const result = await this.db.query<AccountRow>(
      `SELECT
         a.id,
         a.user_id,
         COALESCE(SUM(le.amount), 0) AS balance,
         a.created_at,
         a.updated_at
       FROM accounts a
       LEFT JOIN ledger_entries le ON le.account_id = a.id
       WHERE a.id = $1
       GROUP BY a.id, a.user_id, a.created_at, a.updated_at`,
      [id]
    );

    return result.rows[0] ? Account.fromRow(result.rows[0]).serialize() : null;
  }

  async findByUserId(userId: string): Promise<SerializedAccount[]> {
    const result = await this.db.query<AccountRow>(
      `SELECT
         a.id,
         a.user_id,
         COALESCE(SUM(le.amount), 0) AS balance,
         a.created_at,
         a.updated_at
       FROM accounts a
       LEFT JOIN ledger_entries le ON le.account_id = a.id
       WHERE a.user_id = $1
       GROUP BY a.id, a.user_id, a.created_at, a.updated_at
       ORDER BY a.created_at ASC`,
      [userId]
    );

    return result.rows.map((row) => Account.fromRow(row).serialize());
  }

  async validateAndLockForTransfer(fromAccountId: string, toAccountId: string, amount: number): Promise<void> {
    const fromAccount = await this.db.query<{ id: string }>(
      `SELECT id FROM accounts WHERE id = $1 FOR UPDATE`,
      [fromAccountId]
    );
    const toAccount = await this.db.query<{ id: string }>(
      `SELECT id FROM accounts WHERE id = $1 FOR UPDATE`,
      [toAccountId]
    );
    if (!fromAccount.rows[0] || !toAccount.rows[0]) {
      throw asAppError(400, 'One or both accounts do not exist');
    }

    const debit = await this.db.query<{ balance: string }>(
      `SELECT
         COALESCE(SUM(amount), 0) AS balance
       FROM ledger_entries
       WHERE account_id = $1`,
      [fromAccountId]
    );

    if (Number(debit.rows[0]?.balance ?? 0) < amount) {
      throw asAppError(400, 'Insufficient funds');
    }
  }
}
