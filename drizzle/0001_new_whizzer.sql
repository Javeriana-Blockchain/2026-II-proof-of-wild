CREATE TABLE "pending_contributions" (
	"tx_hash" text PRIMARY KEY NOT NULL,
	"case_id" uuid NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_attempt_at" timestamp with time zone,
	CONSTRAINT "pending_contributions_tx_hash_format" CHECK ("pending_contributions"."tx_hash" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
ALTER TABLE "contributions" ALTER COLUMN "confirmed_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "pending_contributions" ADD CONSTRAINT "pending_contributions_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pending_contributions_submitted_idx" ON "pending_contributions" USING btree ("submitted_at");