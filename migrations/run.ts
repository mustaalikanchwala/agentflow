import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function runMigrations() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:{ rejectUnauthorized: false },
  });

  const client = await pool.connect();

  try {
    // Create migrations tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id         SERIAL PRIMARY KEY,
        filename   VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Get list of applied migrations
    const applied = await client.query<{ filename: string }>(
      'SELECT filename FROM migrations ORDER BY id'
    );
    const appliedSet = new Set(applied.rows.map((r) => r.filename));

    // Read migration files
    const migrationsDir = path.join(__dirname);
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    let ran = 0;
    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`⏭  Skipping: ${file} (already applied)`);
        continue;
      }

      console.log(`▶  Running: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`✓  Applied: ${file}`);
        ran++;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }

    if (ran === 0) {
      console.log('✓  Database is up to date.');
    } else {
      console.log(`\n✓  Applied ${ran} migration(s) successfully.`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
