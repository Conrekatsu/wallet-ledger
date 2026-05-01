import pool from '../db/pool';
import { DbPool, Queryable } from './types';

export async function withTransaction<T>(
  work: (client: Queryable) => Promise<T>,
  db: DbPool = pool as DbPool
): Promise<T> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      throw rollbackError;
    }

    throw error;
  } finally {
    client.release();
  }
}
