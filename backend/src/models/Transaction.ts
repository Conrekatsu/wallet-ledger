export type TransactionStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface SerializedTransaction {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  status: TransactionStatus;
  lastError: string | null;
  idempotencyKey: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Transaction {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  status: TransactionStatus;
  lastError: string | null;
  idempotencyKey: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: {
    id: string;
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    status: TransactionStatus;
    lastError: string | null;
    idempotencyKey: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = data.id;
    this.fromAccountId = data.fromAccountId;
    this.toAccountId = data.toAccountId;
    this.amount = data.amount;
    this.status = data.status;
    this.lastError = data.lastError;
    this.idempotencyKey = data.idempotencyKey;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static fromRow(row: {
    id: string;
    from_account_id: string;
    to_account_id: string;
    amount: number;
    status: TransactionStatus;
    last_error: string | null;
    idempotency_key: string;
    created_at: Date;
    updated_at: Date;
  }): Transaction {
    return new Transaction({
      id: row.id,
      fromAccountId: row.from_account_id,
      toAccountId: row.to_account_id,
      amount: row.amount,
      status: row.status,
      lastError: row.last_error,
      idempotencyKey: row.idempotency_key,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  serialize(): SerializedTransaction {
    return {
      id: this.id,
      fromAccountId: this.fromAccountId,
      toAccountId: this.toAccountId,
      amount: this.amount,
      status: this.status,
      lastError: this.lastError,
      idempotencyKey: this.idempotencyKey,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export interface CreateTransactionInput {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  idempotencyKey: string;
}
