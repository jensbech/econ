ALTER TABLE "expenses" ADD COLUMN "scope" text DEFAULT 'household' NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "is_shared" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "import_batches" ADD COLUMN "scope" text DEFAULT 'household' NOT NULL;