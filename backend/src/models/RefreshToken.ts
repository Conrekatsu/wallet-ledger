export interface SerializedRefreshToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

export class RefreshToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;

  constructor(data: {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
    createdAt: Date;
  }) {
    this.id = data.id;
    this.userId = data.userId;
    this.token = data.token;
    this.expiresAt = data.expiresAt;
    this.createdAt = data.createdAt;
  }

  static fromRow(row: {
    id: string;
    user_id: string;
    token: string;
    expires_at: Date;
    created_at: Date;
  }): RefreshToken {
    return new RefreshToken({
      id: row.id,
      userId: row.user_id,
      token: row.token,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    });
  }

  serialize(): SerializedRefreshToken {
    return {
      id: this.id,
      userId: this.userId,
      token: this.token,
      expiresAt: this.expiresAt,
      createdAt: this.createdAt,
    };
  }
}

export interface CreateRefreshTokenInput {
  userId: string;
  token: string;
  expiresAt: Date;
}
