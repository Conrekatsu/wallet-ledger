export type LedgerEntryType = 'credit' | 'debit';

export interface SerializedLedgerEntry {
  id: string;
  accountId: string;
  transactionId: string;
  amount: number;
  type: LedgerEntryType;
  createdAt: Date;
  updatedAt: Date;
}

export class LedgerEntry {
  id: string;
  accountId: string;
  transactionId: string;
  amount: number;
  type: LedgerEntryType;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: {
    id: string;
    accountId: string;
    transactionId: string;
    amount: number;
    type: LedgerEntryType;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = data.id;
    this.accountId = data.accountId;
    this.transactionId = data.transactionId;
    this.amount = data.amount;
    this.type = data.type;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static fromRow(row: {
    id: string;
    account_id: string;
    transfer_id: string;
    amount: number;
    type: LedgerEntryType;
    created_at: Date;
    updated_at: Date;
  }): LedgerEntry {
    return new LedgerEntry({
      id: row.id,
      accountId: row.account_id,
      transactionId: row.transfer_id,
      amount: row.amount,
      type: row.type,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  serialize(): SerializedLedgerEntry {
    return {
      id: this.id,
      accountId: this.accountId,
      transactionId: this.transactionId,
      amount: this.amount,
      type: this.type,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export interface CreateLedgerEntryInput {
  accountId: string;
  transactionId: string;
  amount: number;
  type: LedgerEntryType;
}
