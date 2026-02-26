import {
	boolean,
	date,
	doublePrecision,
	integer,
	pgEnum,
	pgTable,
	primaryKey,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const categoryTypeEnum = pgEnum("category_type", ["income", "expense"]);
export const frequencyEnum = pgEnum("frequency", [
	"weekly",
	"monthly",
	"annual",
]);
export const templateTypeEnum = pgEnum("template_type", ["expense", "income"]);
export const incomeTypeEnum = pgEnum("income_type", ["salary", "variable"]);
export const loanTypeEnum = pgEnum("loan_type", [
	"mortgage",
	"student",
	"car",
	"consumer",
	"other",
]);

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	email: text("email").notNull().unique(),
	name: text("name"),
	image: text("image"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

// ---------------------------------------------------------------------------
// Households
// ---------------------------------------------------------------------------

export const households = pgTable("households", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	name: text("name").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

// ---------------------------------------------------------------------------
// Household members (join table)
// ---------------------------------------------------------------------------

export const householdMembers = pgTable(
	"household_members",
	{
		householdId: text("household_id")
			.notNull()
			.references(() => households.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		role: text("role").notNull().default("member"),
	},
	(table) => [primaryKey({ columns: [table.householdId, table.userId] })],
);

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export const categories = pgTable("categories", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	householdId: text("household_id")
		.notNull()
		.references(() => households.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	type: categoryTypeEnum("type").notNull(),
	isDefault: boolean("is_default").notNull().default(false),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

export const accounts = pgTable("accounts", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	householdId: text("household_id")
		.notNull()
		.references(() => households.id, { onDelete: "cascade" }),
	userId: text("user_id")
		.notNull()
		.references(() => users.id),
	name: text("name").notNull(),
	accountNumber: text("account_number"), // e.g. "1234.56.78901" (plaintext for compatibility; DEPRECATED: use accountNumberEncrypted in future)
	type: text("type").notNull().default("public"), // 'public' | 'private'
	kind: text("kind").notNull().default("checking"), // 'checking' | 'savings' | 'credit' | 'investment'
	icon: text("icon").notNull().default("wallet"), // lucide icon name
	openingBalanceOere: integer("opening_balance_oere"),
	openingBalanceDate: date("opening_balance_date"),
	coinSymbol: text("coin_symbol"),
	coinQuantity: doublePrecision("coin_quantity"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	deletedAt: timestamp("deleted_at", { withTimezone: true }),
	// TODO: Add encrypted account number field in future migration
	// accountNumberEncrypted: text("account_number_encrypted"), // Application-level encryption required
});

// ---------------------------------------------------------------------------
// Recurring templates
// ---------------------------------------------------------------------------

export const recurringTemplates = pgTable("recurring_templates", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	householdId: text("household_id")
		.notNull()
		.references(() => households.id, { onDelete: "cascade" }),
	userId: text("user_id")
		.notNull()
		.references(() => users.id),
	categoryId: text("category_id").references(() => categories.id),
	accountId: text("account_id").references(() => accounts.id),
	amountOere: integer("amount_oere").notNull(),
	frequency: frequencyEnum("frequency").notNull(),
	startDate: date("start_date").notNull(),
	endDate: date("end_date"),
	type: templateTypeEnum("type").notNull(),
	description: text("description").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// ---------------------------------------------------------------------------
// Import batches
// ---------------------------------------------------------------------------

export const importBatches = pgTable("import_batches", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	householdId: text("household_id")
		.notNull()
		.references(() => households.id, { onDelete: "cascade" }),
	userId: text("user_id")
		.notNull()
		.references(() => users.id),
	filename: text("filename").notNull(),
	rowCount: integer("row_count").notNull(),
	scope: text("scope").notNull().default("household"), // 'household' | 'personal'
	accountId: text("account_id").references(() => accounts.id),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	rolledBackAt: timestamp("rolled_back_at", { withTimezone: true }),
});

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

export const expenses = pgTable("expenses", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	householdId: text("household_id")
		.notNull()
		.references(() => households.id, { onDelete: "cascade" }),
	userId: text("user_id")
		.notNull()
		.references(() => users.id),
	categoryId: text("category_id").references(() => categories.id),
	amountOere: integer("amount_oere").notNull(),
	date: date("date").notNull(),
	notes: text("notes"),
	scope: text("scope").notNull().default("household"), // 'household' | 'personal'
	isShared: boolean("is_shared").notNull().default(false), // personal only: visible to household?
	accountId: text("account_id").references(() => accounts.id),
	loanId: text("loan_id").references(() => loans.id),
	interestOere: integer("interest_oere"),
	principalOere: integer("principal_oere"),
	recurringTemplateId: text("recurring_template_id").references(
		() => recurringTemplates.id,
	),
	importBatchId: text("import_batch_id").references(() => importBatches.id),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// ---------------------------------------------------------------------------
// Income entries
// ---------------------------------------------------------------------------

export const incomeEntries = pgTable("income_entries", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	householdId: text("household_id")
		.notNull()
		.references(() => households.id, { onDelete: "cascade" }),
	userId: text("user_id")
		.notNull()
		.references(() => users.id),
	categoryId: text("category_id").references(() => categories.id),
	amountOere: integer("amount_oere").notNull(),
	date: date("date").notNull(),
	source: text("source"),
	type: incomeTypeEnum("type").notNull(),
	accountId: text("account_id").references(() => accounts.id),
	recurringTemplateId: text("recurring_template_id").references(
		() => recurringTemplates.id,
	),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// ---------------------------------------------------------------------------
// Loans
// ---------------------------------------------------------------------------

export const loans = pgTable("loans", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	householdId: text("household_id")
		.notNull()
		.references(() => households.id, { onDelete: "cascade" }),
	userId: text("user_id")
		.notNull()
		.references(() => users.id),
	name: text("name").notNull(),
	type: loanTypeEnum("type").notNull(),
	principalOere: integer("principal_oere").notNull(),
	interestRate: doublePrecision("interest_rate").notNull(),
	termMonths: integer("term_months").notNull(),
	startDate: date("start_date").notNull(),
	accountId: text("account_id").references(() => accounts.id),
	openingBalanceOere: integer("opening_balance_oere"),
	openingBalanceDate: date("opening_balance_date"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// ---------------------------------------------------------------------------
// Loan payments
// ---------------------------------------------------------------------------
// TODO: Drop this table once confirmed empty. Loan balance is now derived
// from expenses (principalOere ?? amountOere) where loanId IS NOT NULL.

export const loanPayments = pgTable("loan_payments", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	loanId: text("loan_id")
		.notNull()
		.references(() => loans.id, { onDelete: "cascade" }),
	amountOere: integer("amount_oere").notNull(),
	date: date("date").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------
//
// ⚠️ INTEGRITY WARNING: This table is currently NOT protected against tampering.
// Database admins or compromised accounts can modify/delete audit log entries.
// For production compliance (GDPR, financial audit standards), implement:
// 1. Cryptographic chaining: each entry hashes the previous entry
// 2. Write-once enforcement: REVOKE UPDATE, DELETE on this table
// 3. Immutable export: periodic backup to immutable store (S3 versioning, etc.)
// 4. Hash verification: separate checksums stored outside database
//
// TODO: Implement audit log integrity protection in future migration
export const auditLog = pgTable("audit_log", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	householdId: text("household_id")
		.notNull()
		.references(() => households.id, { onDelete: "cascade" }),
	userId: text("user_id")
		.notNull()
		.references(() => users.id),
	action: text("action").notNull(), // 'create', 'update', 'delete', etc.
	resourceType: text("resource_type").notNull(), // 'expense', 'income', 'account', etc.
	resourceId: text("resource_id").notNull(),
	changes: text("changes"), // JSON string of what changed
	timestamp: timestamp("timestamp", { withTimezone: true })
		.notNull()
		.defaultNow(),
	// TODO: Add integrity fields
	// previousHash: text("previous_hash"), // Hash of previous log entry
	// entryHash: text("entry_hash"),       // Hash of this entry
});
