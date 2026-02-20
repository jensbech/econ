import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  date,
  numeric,
} from "drizzle-orm/pg-core";

// ─── Enums ─────────────────────────────────────────────────────────────────

export const categoryTypeEnum = pgEnum("category_type", ["income", "expense"]);

export const frequencyEnum = pgEnum("frequency", [
  "weekly",
  "monthly",
  "annual",
]);

export const recurringTemplateTypeEnum = pgEnum("recurring_template_type", [
  "expense",
  "income",
]);

export const loanTypeEnum = pgEnum("loan_type", ["mortgage", "student"]);

export const incomeTypeEnum = pgEnum("income_type", ["salary", "variable"]);

export const householdRoleEnum = pgEnum("household_role", ["owner", "member"]);

// ─── Tables ────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const households = pgTable("households", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const householdMembers = pgTable("household_members", {
  householdId: integer("household_id")
    .notNull()
    .references(() => households.id),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  role: householdRoleEnum("role").notNull().default("member"),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  householdId: integer("household_id")
    .notNull()
    .references(() => households.id),
  name: text("name").notNull(),
  type: categoryTypeEnum("type").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const recurringTemplates = pgTable("recurring_templates", {
  id: serial("id").primaryKey(),
  householdId: integer("household_id")
    .notNull()
    .references(() => households.id),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  categoryId: integer("category_id").references(() => categories.id),
  amountOere: integer("amount_oere").notNull(),
  frequency: frequencyEnum("frequency").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  type: recurringTemplateTypeEnum("type").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const importBatches = pgTable("import_batches", {
  id: serial("id").primaryKey(),
  householdId: integer("household_id")
    .notNull()
    .references(() => households.id),
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

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  householdId: integer("household_id")
    .notNull()
    .references(() => households.id),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  categoryId: integer("category_id").references(() => categories.id),
  amountOere: integer("amount_oere").notNull(),
  date: date("date").notNull(),
  notes: text("notes"),
  recurringTemplateId: integer("recurring_template_id").references(
    () => recurringTemplates.id,
  ),
  importBatchId: integer("import_batch_id").references(() => importBatches.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const incomeEntries = pgTable("income_entries", {
  id: serial("id").primaryKey(),
  householdId: integer("household_id")
    .notNull()
    .references(() => households.id),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  categoryId: integer("category_id").references(() => categories.id),
  amountOere: integer("amount_oere").notNull(),
  date: date("date").notNull(),
  source: text("source"),
  type: incomeTypeEnum("type").notNull(),
  recurringTemplateId: integer("recurring_template_id").references(
    () => recurringTemplates.id,
  ),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const loans = pgTable("loans", {
  id: serial("id").primaryKey(),
  householdId: integer("household_id")
    .notNull()
    .references(() => households.id),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  type: loanTypeEnum("type").notNull(),
  principalOere: integer("principal_oere").notNull(),
  interestRate: numeric("interest_rate", { precision: 6, scale: 4 }).notNull(),
  termMonths: integer("term_months").notNull(),
  startDate: date("start_date").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const loanPayments = pgTable("loan_payments", {
  id: serial("id").primaryKey(),
  loanId: integer("loan_id")
    .notNull()
    .references(() => loans.id),
  amountOere: integer("amount_oere").notNull(),
  date: date("date").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const savingsGoals = pgTable("savings_goals", {
  id: serial("id").primaryKey(),
  householdId: integer("household_id")
    .notNull()
    .references(() => households.id),
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
