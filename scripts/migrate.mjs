import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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
const db = drizzle(client);

console.log('Applying database migrations...');
await migrate(db, { migrationsFolder: join(__dirname, '../db/migrations') });
console.log('Migrations complete.');

await client.end();
