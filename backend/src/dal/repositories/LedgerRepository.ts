import pool from '../../db/pool';
import { asAppError } from '../../lib/appError';
import {
  CreateLedgerEntryInput,
  LedgerEntry,
  SerializedLedgerEntry,
} from '../../models/LedgerEntry';
import { Queryable } from '../types';

type LedgerRow = {
  id: string;
  account_id: string;
  transfer_id: string;
  amount: number;
  type: 'credit' | 'debit';
  created_at: Date;
  updated_at: Date;
};

type AccountTransactionHistoryRow = {
  id: string;
  transfer_id: string;
  type: 'credit' | 'debit';
  amount: number;
  created_at: Date;
};

export class LedgerRepository {
  constructor(private readonly db: Queryable = pool) {}

  async findTransferEntriesByTransactionId(transactionId: string): Promise<{
    debit: SerializedLedgerEntry;
    credit: SerializedLedgerEntry;
  } | null> {
    const result = await this.db.query<LedgerRow>(
      `SELECT id, account_id, transfer_id, amount, type, created_at, updated_at
       FROM ledger_entries
       WHERE transfer_id = $1`,
      [transactionId]
    );

    const debitRow = result.rows.find((row) => row.type === 'debit');
    const creditRow = result.rows.find((row) => row.type === 'credit');
    if (!debitRow || !creditRow) {
      return null;
    }

    return {
      debit: LedgerEntry.fromRow(debitRow).serialize(),
      credit: LedgerEntry.fromRow(creditRow).serialize(),
    };
  }

  async createTransferEntries(input: {
    fromAccountId: string;
    toAccountId: string;
    transactionId: string;
    amount: number;
  }): Promise<{ debit: SerializedLedgerEntry; credit: SerializedLedgerEntry }> {
    const result = await this.db.query<LedgerRow>(
      `INSERT INTO ledger_entries (account_id, transfer_id, amount, type)
       VALUES ($1, $3, -($4::numeric), 'debit'),
              ($2, $3, $4::numeric, 'credit')
       RETURNING id, account_id, transfer_id, amount, type, created_at, updated_at`,
      [input.fromAccountId, input.toAccountId, input.transactionId, input.amount]
    );

    const debitRow = result.rows.find((row) => row.type === 'debit');
    const creditRow = result.rows.find((row) => row.type === 'credit');
    if (!debitRow || !creditRow || result.rows.length !== 2) {
      throw asAppError(500, 'Expected exactly 2 ledger entries for transfer');
    }

    return {
      debit: LedgerEntry.fromRow(debitRow).serialize(),
      credit: LedgerEntry.fromRow(creditRow).serialize(),
    };
  }

  async create(input: CreateLedgerEntryInput): Promise<SerializedLedgerEntry> {
    const result = await this.db.query<LedgerRow>(
      `INSERT INTO ledger_entries (account_id, transfer_id, amount, type)
       VALUES ($1, $2, $3, $4)
       RETURNING id, account_id, transfer_id, amount, type, created_at, updated_at`,
      [input.accountId, input.transactionId, input.amount, input.type]
    );

    return LedgerEntry.fromRow(result.rows[0]).serialize();
  }

  async findAccountTransactions(accountId: string): Promise<
    Array<{
      id: string;
      transferId: string;
      type: 'credit' | 'debit';
      amount: number;
      timestamp: Date;
    }>
  > {
    const result = await this.db.query<AccountTransactionHistoryRow>(
      `SELECT id, transfer_id, type, amount, created_at
       FROM ledger_entries
       WHERE account_id = $1
       ORDER BY created_at DESC`,
      [accountId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      transferId: row.transfer_id,
      type: row.type,
      amount: row.amount,
      timestamp: row.created_at,
    }));
  }
}
