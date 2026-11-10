CREATE TYPE "public"."animal_group" AS ENUM('ave', 'mamifero', 'reptil', 'anfibio');--> statement-breakpoint
CREATE TYPE "public"."availability" AS ENUM('toda_la_jornada', 'manana', 'tarde');--> statement-breakpoint
CREATE TYPE "public"."case_outcome" AS ENUM('liberado', 'en_reserva', 'reubicado', 'fallecido');--> statement-breakpoint
CREATE TYPE "public"."case_status" AS ENUM('activo', 'recuperado');--> statement-breakpoint
CREATE TYPE "public"."expense_category" AS ENUM('alimentacion', 'atencion_veterinaria', 'medicamentos', 'rehabilitacion', 'traslado_liberacion');--> statement-breakpoint
CREATE TYPE "public"."ngo_kind" AS ENUM('centro_atencion', 'fundacion', 'ong');--> statement-breakpoint
CREATE TYPE "public"."ngo_status" AS ENUM('en_revision', 'aprobada', 'rechazada');--> statement-breakpoint
CREATE TYPE "public"."stage_status" AS ENUM('pendiente', 'en_curso', 'completada');--> statement-breakpoint
CREATE TYPE "public"."tx_status" AS ENUM('enviada', 'confirmada', 'fallida');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('persona', 'ong', 'admin');--> statement-breakpoint
CREATE TYPE "public"."validation_level" AS ENUM('presentado', 'revisado', 'verificado_independiente');--> statement-breakpoint
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
CREATE TABLE "auth_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"client_public" text NOT NULL,
	"server_public" text NOT NULL,
	"server_secret" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"succeeded" boolean,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"ngo_id" uuid NOT NULL,
	"common_name" text NOT NULL,
	"scientific_name" text NOT NULL,
	"group" "animal_group" NOT NULL,
	"species_public" boolean DEFAULT true NOT NULL,
	"short_story" text NOT NULL,
	"story" text NOT NULL,
	"photo_path" text,
	"intake_date" date NOT NULL,
	"status" "case_status" DEFAULT 'activo' NOT NULL,
	"outcome" "case_outcome",
	"outcome_label" text,
	"outcome_date" date,
	"contract_tx_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cases_code_unique" UNIQUE("code"),
	CONSTRAINT "cases_code_format" CHECK ("cases"."code" ~ '^POW_[0-9]{3,6}$'),
	CONSTRAINT "cases_outcome_when_recovered" CHECK ("cases"."status" = 'activo' OR "cases"."outcome" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "contribution_allocations" (
	"contribution_id" uuid NOT NULL,
	"stage_id" uuid NOT NULL,
	"amount" numeric(20, 7) NOT NULL,
	CONSTRAINT "contribution_allocations_contribution_id_stage_id_pk" PRIMARY KEY("contribution_id","stage_id"),
	CONSTRAINT "contribution_allocations_positive" CHECK ("contribution_allocations"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "contributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"donor_account" text NOT NULL,
	"amount" numeric(20, 7) NOT NULL,
	"tx_hash" text NOT NULL,
	"status" "tx_status" DEFAULT 'enviada' NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmed_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	CONSTRAINT "contributions_tx_hash_unique" UNIQUE("tx_hash"),
	CONSTRAINT "contributions_amount_positive" CHECK ("contributions"."amount" > 0),
	CONSTRAINT "contributions_tx_hash" CHECK ("contributions"."tx_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "contributions_donor" CHECK ("contributions"."donor_account" ~ '^G[A-Z2-7]{55}$'),
	CONSTRAINT "contributions_confirmed_at" CHECK ("contributions"."status" <> 'confirmada' OR "contributions"."confirmed_at" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "donors" (
	"stellar_account" text PRIMARY KEY NOT NULL,
	"alias" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "donors_stellar" CHECK ("donors"."stellar_account" ~ '^G[A-Z2-7]{55}$')
);
--> statement-breakpoint
CREATE TABLE "enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"volunteering_id" uuid NOT NULL,
	"user_id" uuid,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"availability" "availability" NOT NULL,
	"data_consent_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "enrollments_volunteering_email_uq" UNIQUE("volunteering_id","email")
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"stage_id" uuid NOT NULL,
	"provider_id" uuid NOT NULL,
	"category" "expense_category" NOT NULL,
	"concept" text,
	"amount" numeric(20, 7) NOT NULL,
	"occurred_on" date NOT NULL,
	"invoice_number" text NOT NULL,
	"invoice_key" text NOT NULL,
	"invoice_hash" text NOT NULL,
	"tx_hash" text,
	"status" "tx_status" DEFAULT 'enviada' NOT NULL,
	"validation_level" "validation_level" DEFAULT 'presentado' NOT NULL,
	"registered_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expenses_tx_hash_unique" UNIQUE("tx_hash"),
	CONSTRAINT "expenses_amount_positive" CHECK ("expenses"."amount" > 0),
	CONSTRAINT "expenses_invoice_hash" CHECK ("expenses"."invoice_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "expenses_confirmed_tx" CHECK ("expenses"."status" <> 'confirmada' OR "expenses"."tx_hash" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"stage_id" uuid NOT NULL,
	"occurred_on" date NOT NULL,
	"description" text NOT NULL,
	"photo_key" text,
	"evidence_hash" text NOT NULL,
	"tx_hash" text,
	"status" "tx_status" DEFAULT 'enviada' NOT NULL,
	"validation_level" "validation_level" DEFAULT 'presentado' NOT NULL,
	"registered_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "milestones_tx_hash_unique" UNIQUE("tx_hash"),
	CONSTRAINT "milestones_evidence_hash" CHECK ("milestones"."evidence_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "milestones_confirmed_tx" CHECK ("milestones"."status" <> 'confirmada' OR "milestones"."tx_hash" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "ngos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"nit" text NOT NULL,
	"kind" "ngo_kind" NOT NULL,
	"kind_detail" text,
	"city" text NOT NULL,
	"founded_year" integer,
	"description" text NOT NULL,
	"environmental_permit" text,
	"contact_name" text NOT NULL,
	"contact_email" text NOT NULL,
	"contact_phone" text NOT NULL,
	"stellar_account" text NOT NULL,
	"offers_volunteering" boolean DEFAULT false NOT NULL,
	"status" "ngo_status" DEFAULT 'en_revision' NOT NULL,
	"photo_path" text,
	"data_consent_at" timestamp with time zone NOT NULL,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ngos_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "ngos_slug_unique" UNIQUE("slug"),
	CONSTRAINT "ngos_stellar_account_unique" UNIQUE("stellar_account"),
	CONSTRAINT "ngos_stellar" CHECK ("ngos"."stellar_account" ~ '^G[A-Z2-7]{55}$'),
	CONSTRAINT "ngos_slug" CHECK ("ngos"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
--> statement-breakpoint
CREATE TABLE "person_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"full_name" text,
	"alias" text,
	"city" text,
	"phone" text,
	"wants_to_donate" boolean DEFAULT true NOT NULL,
	"wants_to_volunteer" boolean DEFAULT false NOT NULL,
	"interests" text[] DEFAULT '{}'::text[] NOT NULL,
	"stellar_account" text,
	"show_alias" boolean DEFAULT true NOT NULL,
	"email_updates" boolean DEFAULT false NOT NULL,
	"data_consent_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "person_profiles_stellar_account_unique" UNIQUE("stellar_account"),
	CONSTRAINT "person_profiles_stellar" CHECK ("person_profiles"."stellar_account" IS NULL OR "person_profiles"."stellar_account" ~ '^G[A-Z2-7]{55}$')
);
--> statement-breakpoint
CREATE TABLE "provider_ngos" (
	"provider_id" uuid NOT NULL,
	"ngo_id" uuid NOT NULL,
	CONSTRAINT "provider_ngos_provider_id_ngo_id_pk" PRIMARY KEY("provider_id","ngo_id")
);
--> statement-breakpoint
CREATE TABLE "providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"sells" text NOT NULL,
	"city" text NOT NULL,
	"stellar_account" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "providers_stellar_account_unique" UNIQUE("stellar_account"),
	CONSTRAINT "providers_stellar" CHECK ("providers"."stellar_account" ~ '^G[A-Z2-7]{55}$')
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "sessions_token_hash" CHECK ("sessions"."token_hash" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"name" text NOT NULL,
	"short_name" text NOT NULL,
	"covers" text,
	"cost" numeric(20, 7) NOT NULL,
	"photo_path" text,
	"status" "stage_status" DEFAULT 'pendiente' NOT NULL,
	CONSTRAINT "stages_case_position_uq" UNIQUE("case_id","position"),
	CONSTRAINT "stages_position_positive" CHECK ("stages"."position" >= 1),
	CONSTRAINT "stages_cost_positive" CHECK ("stages"."cost" > 0)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"role" "user_role" NOT NULL,
	"srp_salt" text NOT NULL,
	"srp_verifier" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_email_lowercase" CHECK ("users"."email" = lower("users"."email")),
	CONSTRAINT "users_srp_hex" CHECK ("users"."srp_salt" ~ '^[0-9a-f]+$' AND "users"."srp_verifier" ~ '^[0-9a-f]+$')
);
--> statement-breakpoint
CREATE TABLE "volunteerings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ngo_id" uuid NOT NULL,
	"title" text NOT NULL,
	"date" date NOT NULL,
	"schedule" text NOT NULL,
	"city" text NOT NULL,
	"tasks" text[] NOT NULL,
	"requirements" text[] NOT NULL,
	"capacity" integer NOT NULL,
	"pre_occupied" integer DEFAULT 0 NOT NULL,
	"photo_path" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "volunteerings_capacity" CHECK ("volunteerings"."capacity" > 0 AND "volunteerings"."pre_occupied" BETWEEN 0 AND "volunteerings"."capacity")
);
--> statement-breakpoint
ALTER TABLE "auth_challenges" ADD CONSTRAINT "auth_challenges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_ngo_id_ngos_id_fk" FOREIGN KEY ("ngo_id") REFERENCES "public"."ngos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contribution_allocations" ADD CONSTRAINT "contribution_allocations_contribution_id_contributions_id_fk" FOREIGN KEY ("contribution_id") REFERENCES "public"."contributions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contribution_allocations" ADD CONSTRAINT "contribution_allocations_stage_id_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."stages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_volunteering_id_volunteerings_id_fk" FOREIGN KEY ("volunteering_id") REFERENCES "public"."volunteerings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_stage_id_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."stages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_registered_by_users_id_fk" FOREIGN KEY ("registered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_stage_id_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."stages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_registered_by_users_id_fk" FOREIGN KEY ("registered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ngos" ADD CONSTRAINT "ngos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_profiles" ADD CONSTRAINT "person_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_ngos" ADD CONSTRAINT "provider_ngos_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_ngos" ADD CONSTRAINT "provider_ngos_ngo_id_ngos_id_fk" FOREIGN KEY ("ngo_id") REFERENCES "public"."ngos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stages" ADD CONSTRAINT "stages_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volunteerings" ADD CONSTRAINT "volunteerings_ngo_id_ngos_id_fk" FOREIGN KEY ("ngo_id") REFERENCES "public"."ngos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_created_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "auth_challenges_user_idx" ON "auth_challenges" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "cases_ngo_idx" ON "cases" USING btree ("ngo_id");--> statement-breakpoint
CREATE INDEX "contributions_case_idx" ON "contributions" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "contributions_donor_idx" ON "contributions" USING btree ("donor_account");--> statement-breakpoint
CREATE INDEX "expenses_case_idx" ON "expenses" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "milestones_case_idx" ON "milestones" USING btree ("case_id");