export interface SerializedAccount {
  id: string;
  userId: string;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
}

export class Account {
  id: string;
  userId: string;
  balance: number;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: { id: string; userId: string; balance: number; createdAt: Date; updatedAt: Date }) {
    this.id = data.id;
    this.userId = data.userId;
    this.balance = data.balance;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static fromRow(row: {
    id: string;
    user_id: string;
    balance: number | string;
    created_at: Date;
    updated_at: Date;
  }): Account {
    return new Account({
      id: row.id,
      userId: row.user_id,
      balance: Number(row.balance),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  serialize(): SerializedAccount {
    return {
      id: this.id,
      userId: this.userId,
      balance: this.balance,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export interface CreateAccountInput {
  userId: string;
  balance?: number;
}
