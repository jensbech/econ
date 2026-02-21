ALTER TYPE "public"."loan_type" ADD VALUE 'car';--> statement-breakpoint
ALTER TYPE "public"."loan_type" ADD VALUE 'consumer';--> statement-breakpoint
ALTER TYPE "public"."loan_type" ADD VALUE 'other';--> statement-breakpoint
ALTER TABLE "savings_goals" ALTER COLUMN "target_oere" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "icon" text DEFAULT 'wallet' NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "savings_goal_id" text;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "loan_id" text;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "interest_oere" integer;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "principal_oere" integer;--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "account_id" text;--> statement-breakpoint
ALTER TABLE "savings_goals" ADD COLUMN "account_id" text;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_savings_goal_id_savings_goals_id_fk" FOREIGN KEY ("savings_goal_id") REFERENCES "public"."savings_goals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savings_goals" ADD CONSTRAINT "savings_goals_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;