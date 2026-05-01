import pool from '../../db/pool';
import {
  CreateRefreshTokenInput,
  RefreshToken,
  SerializedRefreshToken,
} from '../../models/RefreshToken';
import { Queryable } from '../types';

type RefreshTokenRow = {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  created_at: Date;
};

export class RefreshTokenRepository {
  constructor(private readonly db: Queryable = pool) {}

  async create(input: CreateRefreshTokenInput): Promise<SerializedRefreshToken> {
    const result = await this.db.query<RefreshTokenRow>(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, token, expires_at, created_at`,
      [input.userId, input.token, input.expiresAt]
    );

    return RefreshToken.fromRow(result.rows[0]).serialize();
  }
}
