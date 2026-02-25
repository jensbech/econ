ALTER TABLE "loans" ADD COLUMN "opening_balance_oere" integer;
--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "opening_balance_date" date;
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "opening_balance_oere" integer;
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "opening_balance_date" date;
