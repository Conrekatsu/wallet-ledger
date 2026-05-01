import pool from '../../db/pool';
import { CreateUserInput, SerializedUser, SerializedUserWithPassword, User } from '../../models/User';
import { Queryable } from '../types';

type UserRow = {
  id: string;
  email: string;
  api_key_hash: string;
  password: string;
  name: string | null;
  created_at: Date;
};

type SafeUserRow = {
  id: string;
  email: string;
  api_key_hash?: string;
  api_key?: string;
  name: string | null;
  created_at: Date;
};

export class UserRepository {
  constructor(private readonly db: Queryable = pool) {}

  async create(input: CreateUserInput & { password: string }): Promise<SerializedUser> {
    const result = await this.db.query<UserRow>(
      `INSERT INTO users (email, api_key, api_key_hash, password, name)
       VALUES ($1, $2, $2, $3, $4)
       RETURNING id, email, COALESCE(api_key_hash, api_key) AS api_key_hash, password, name, created_at`,
      [input.email, input.apiKey, input.password, input.name ?? null]
    );

    return User.fromRow(result.rows[0]).serialize();
  }

  async findByEmail(email: string): Promise<SerializedUserWithPassword | null> {
    const result = await this.db.query<UserRow>(
      `SELECT id, email, COALESCE(api_key_hash, api_key) AS api_key_hash, password, name, created_at
       FROM users
       WHERE email = $1`,
      [email]
    );

    return result.rows[0] ? User.fromRow(result.rows[0]).serializeWithPassword() : null;
  }

  async findSafeById(id: string): Promise<SerializedUser | null> {
    const result = await this.db.query<SafeUserRow>(
      `SELECT id, email, name, created_at FROM users WHERE id = $1`,
      [id]
    );

    if (!result.rows[0]) {
      return null;
    }

    const safeUser = User.fromSafeRow(result.rows[0]);
    return safeUser.serialize();
  }

  async findSafeByApiKey(apiKey: string): Promise<SerializedUser | null> {
    const result = await this.db.query<SafeUserRow>(
      `SELECT id, email, name, created_at
       FROM users
       WHERE api_key_hash = $1 OR api_key = $1`,
      [apiKey]
    );

    if (!result.rows[0]) {
      return null;
    }

    return User.fromSafeRow(result.rows[0]).serialize();
  }
}
