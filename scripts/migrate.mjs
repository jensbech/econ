import { createHash } from 'crypto';
import { readFileSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';

const __dirname = dirname(fileURLToPath(import.meta.url));

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not set');
  process.exit(1);
}

if (process.env.NODE_ENV === 'production' && process.env.ALLOW_MIGRATE !== 'true') {
  console.error('ERROR: Refusing to run migrations in production without ALLOW_MIGRATE=true.');
  console.error('Set ALLOW_MIGRATE=true to confirm you intend to migrate the production database.');
  process.exit(1);
}

const client = postgres(process.env.DATABASE_URL, { max: 1 });

const migrationsDir = join(__dirname, '../db/migrations');
const files = readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

await client`CREATE SCHEMA IF NOT EXISTS drizzle`;
await client`
  CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
    id serial PRIMARY KEY,
    hash text NOT NULL,
    created_at bigint
  )
`;

const applied = await client`SELECT hash FROM drizzle.__drizzle_migrations ORDER BY id`;
const appliedHashes = new Set(applied.map(r => r.hash));

console.log(`Applying database migrations... (${files.length} files, ${appliedHashes.size} already applied)`);

let count = 0;
for (const file of files) {
  const content = readFileSync(join(migrationsDir, file), 'utf8');
  const hash = createHash('sha256').update(content).digest('hex');

  if (appliedHashes.has(hash)) {
    console.log(`  skip: ${file}`);
    continue;
  }

  console.log(`  apply: ${file}`);
  const statements = content.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean);

  await client.begin(async tx => {
    for (const stmt of statements) {
      await tx.unsafe(stmt);
    }
    await tx`INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES (${hash}, ${Date.now()})`;
  });

  count++;
}

console.log(`Migrations complete. Applied: ${count}, skipped: ${files.length - count}`);

await client.end();
