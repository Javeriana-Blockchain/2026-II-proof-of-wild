CREATE TYPE "public"."case_stage" AS ENUM('ingreso', 'cuarentena', 'evaluacion_veterinaria', 'rehabilitacion', 'revision_progreso', 'destino_final');--> statement-breakpoint
CREATE TYPE "public"."contribution_kind" AS ENUM('unico', 'recurrente');--> statement-breakpoint
CREATE TYPE "public"."expense_status" AS ENUM('borrador', 'pendiente', 'verificado', 'rechazado');--> statement-breakpoint
CREATE TYPE "public"."final_destination" AS ENUM('liberacion', 'reubicacion', 'santuario', 'fallecimiento');--> statement-breakpoint
CREATE TYPE "public"."need_category" AS ENUM('alimentacion', 'atencion_veterinaria', 'medicamentos', 'rehabilitacion', 'destino_final');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('center', 'validator', 'admin');--> statement-breakpoint
CREATE TYPE "public"."validation_level" AS ENUM('presentado', 'revisado', 'verificado_independiente');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('pending', 'verified', 'rejected');--> statement-breakpoint
CREATE TABLE "app_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role" "user_role" NOT NULL,
	"center_id" uuid,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"display_name" text NOT NULL,
	"stellar_account" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_users_email_unique" UNIQUE("email"),
	CONSTRAINT "app_users_center_required" CHECK ("app_users"."role" = 'admin' OR "app_users"."center_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text,
	"data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"center_id" uuid NOT NULL,
	"species" text NOT NULL,
	"species_public" boolean DEFAULT false NOT NULL,
	"intake_date" date NOT NULL,
	"initial_state" text NOT NULL,
	"goal_amount" numeric(20, 7) NOT NULL,
	"current_stage" "case_stage" DEFAULT 'ingreso' NOT NULL,
	"final_destination" "final_destination",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cases_code_unique" UNIQUE("code"),
	CONSTRAINT "cases_code_format" CHECK ("cases"."code" ~ '^POW-[0-9]{3,6}$'),
	CONSTRAINT "cases_goal_positive" CHECK ("cases"."goal_amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "centers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"city" text NOT NULL,
	"stellar_account" text NOT NULL,
	"domain" text,
	"verification_status" "verification_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "centers_stellar_account_unique" UNIQUE("stellar_account")
);
--> statement-breakpoint
CREATE TABLE "contributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"donor_id" uuid NOT NULL,
	"amount" numeric(20, 7) NOT NULL,
	"asset_code" text NOT NULL,
	"tx_hash" text NOT NULL,
	"kind" "contribution_kind" DEFAULT 'unico' NOT NULL,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contributions_tx_hash_unique" UNIQUE("tx_hash"),
	CONSTRAINT "contributions_amount_positive" CHECK ("contributions"."amount" > 0),
	CONSTRAINT "contributions_tx_hash_format" CHECK ("contributions"."tx_hash" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "donors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stellar_account" text NOT NULL,
	"display_name" text,
	"email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "donors_stellar_account_unique" UNIQUE("stellar_account")
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"category" "need_category" NOT NULL,
	"amount" numeric(20, 7) NOT NULL,
	"support_key" text,
	"support_hash" text NOT NULL,
	"status" "expense_status" DEFAULT 'borrador' NOT NULL,
	"registered_by" uuid NOT NULL,
	"validated_by" uuid,
	"anchor_tx_hash" text,
	"validation_tx_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"validated_at" timestamp with time zone,
	CONSTRAINT "expenses_anchor_tx_hash_unique" UNIQUE("anchor_tx_hash"),
	CONSTRAINT "expenses_validation_tx_hash_unique" UNIQUE("validation_tx_hash"),
	CONSTRAINT "expenses_amount_positive" CHECK ("expenses"."amount" > 0),
	CONSTRAINT "expenses_support_hash_format" CHECK ("expenses"."support_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "expenses_registrant_not_validator" CHECK ("expenses"."validated_by" IS NULL OR "expenses"."validated_by" <> "expenses"."registered_by"),
	CONSTRAINT "expenses_anchor_required" CHECK ("expenses"."status" NOT IN ('pendiente', 'verificado') OR "expenses"."anchor_tx_hash" IS NOT NULL),
	CONSTRAINT "expenses_verified_requires_validation" CHECK ("expenses"."status" <> 'verificado' OR ("expenses"."validated_by" IS NOT NULL AND "expenses"."validation_tx_hash" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"stage" "case_stage" NOT NULL,
	"occurred_at" date NOT NULL,
	"description" text NOT NULL,
	"evidence_key" text,
	"evidence_hash" text NOT NULL,
	"validation_level" "validation_level" DEFAULT 'presentado' NOT NULL,
	"registered_by" uuid NOT NULL,
	"validated_by" uuid,
	"anchor_tx_hash" text,
	"validation_tx_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"validated_at" timestamp with time zone,
	CONSTRAINT "milestones_anchor_tx_hash_unique" UNIQUE("anchor_tx_hash"),
	CONSTRAINT "milestones_validation_tx_hash_unique" UNIQUE("validation_tx_hash"),
	CONSTRAINT "milestones_evidence_hash_format" CHECK ("milestones"."evidence_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "milestones_registrant_not_validator" CHECK ("milestones"."validated_by" IS NULL OR "milestones"."validated_by" <> "milestones"."registered_by"),
	CONSTRAINT "milestones_validated_requires_validation" CHECK ("milestones"."validation_level" = 'presentado' OR ("milestones"."validated_by" IS NOT NULL AND "milestones"."validation_tx_hash" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "needs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"category" "need_category" NOT NULL,
	"budget_amount" numeric(20, 7) NOT NULL,
	CONSTRAINT "needs_case_category_uq" UNIQUE("case_id","category"),
	CONSTRAINT "needs_budget_nonnegative" CHECK ("needs"."budget_amount" >= 0)
);
--> statement-breakpoint
ALTER TABLE "app_users" ADD CONSTRAINT "app_users_center_id_centers_id_fk" FOREIGN KEY ("center_id") REFERENCES "public"."centers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_center_id_centers_id_fk" FOREIGN KEY ("center_id") REFERENCES "public"."centers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_donor_id_donors_id_fk" FOREIGN KEY ("donor_id") REFERENCES "public"."donors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_registered_by_app_users_id_fk" FOREIGN KEY ("registered_by") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_validated_by_app_users_id_fk" FOREIGN KEY ("validated_by") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_registered_by_app_users_id_fk" FOREIGN KEY ("registered_by") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_validated_by_app_users_id_fk" FOREIGN KEY ("validated_by") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "needs" ADD CONSTRAINT "needs_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_created_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "cases_center_idx" ON "cases" USING btree ("center_id");--> statement-breakpoint
CREATE INDEX "contributions_case_idx" ON "contributions" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "contributions_donor_idx" ON "contributions" USING btree ("donor_id");--> statement-breakpoint
CREATE INDEX "expenses_case_idx" ON "expenses" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "milestones_case_idx" ON "milestones" USING btree ("case_id");