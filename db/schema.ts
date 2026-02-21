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
export const loanTypeEnum = pgEnum("loan_type", ["mortgage", "student"]);

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
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// ---------------------------------------------------------------------------
// Loan payments
// ---------------------------------------------------------------------------

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
// Savings goals
// ---------------------------------------------------------------------------

export const savingsGoals = pgTable("savings_goals", {
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
	targetOere: integer("target_oere").notNull(),
	currentOere: integer("current_oere").notNull().default(0),
	targetDate: date("target_date"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
