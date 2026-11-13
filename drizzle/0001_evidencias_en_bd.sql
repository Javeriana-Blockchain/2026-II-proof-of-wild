CREATE TABLE "evidence_files" (
	"key" text PRIMARY KEY NOT NULL,
	"content_type" text NOT NULL,
	"sha256" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"data" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "evidence_files_sha256" CHECK ("evidence_files"."sha256" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "evidence_files_key" CHECK ("evidence_files"."key" ~ '^[0-9a-f-]{36}\.[a-z]{2,4}$')
);
