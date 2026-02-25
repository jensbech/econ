import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
	throw new Error("DATABASE_URL environment variable is not set");
}

// Create database client
const sslMode = process.env.DATABASE_SSL;
const client = postgres(process.env.DATABASE_URL, {
	ssl: sslMode === "require"
		? { rejectUnauthorized: true }
		: sslMode === "allow"
			? { rejectUnauthorized: false }
			: false,
});

export const db = drizzle(client, { schema });
