import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import pool from './pool';

async function migrate() {
  const client = await pool.connect();
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, '../../migrations/001_init.sql'),
      'utf8'
    );
    await client.query(sql);
    console.log('Migrations applied successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
