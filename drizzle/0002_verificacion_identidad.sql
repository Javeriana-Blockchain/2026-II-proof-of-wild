CREATE TYPE "public"."identity_document" AS ENUM('cedula', 'pasaporte');--> statement-breakpoint
CREATE TYPE "public"."identity_method" AS ENUM('biometria', 'simulada');--> statement-breakpoint
CREATE TABLE "identity_verifications" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"document_type" "identity_document" NOT NULL,
	"document_hash" text NOT NULL,
	"document_last4" text NOT NULL,
	"method" "identity_method" NOT NULL,
	"face_match" numeric(4, 3),
	"provider" text NOT NULL,
	"provider_reference" text NOT NULL,
	"consent_at" timestamp with time zone NOT NULL,
	"verified_at" timestamp with time zone NOT NULL,
	CONSTRAINT "identity_verifications_document_hash_unique" UNIQUE("document_hash"),
	CONSTRAINT "identity_verifications_hash" CHECK ("identity_verifications"."document_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "identity_verifications_last4" CHECK ("identity_verifications"."document_last4" ~ '^[0-9A-Z]{4}$'),
	CONSTRAINT "identity_verifications_face_match" CHECK (("identity_verifications"."method" = 'simulada' AND "identity_verifications"."face_match" IS NULL) OR ("identity_verifications"."method" = 'biometria' AND "identity_verifications"."face_match" BETWEEN 0 AND 1))
);
--> statement-breakpoint
ALTER TABLE "identity_verifications" ADD CONSTRAINT "identity_verifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;