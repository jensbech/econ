import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
	throw new Error("DATABASE_URL environment variable is not set");
}

// Validate database URL uses encrypted connection in production
if (process.env.NODE_ENV === "production") {
	if (!process.env.DATABASE_URL.startsWith("postgresql://")) {
		throw new Error(
			"DATABASE_URL must use encrypted PostgreSQL connection (postgresql://). " +
			"Use postgres:// only in development.",
		);
	}
}

// Create database client with SSL enforcement
const client = postgres(process.env.DATABASE_URL, {
	ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: true } : undefined,
});

export const db = drizzle(client, { schema });
