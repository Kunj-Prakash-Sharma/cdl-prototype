CREATE TYPE "public"."lead_source" AS ENUM('home', 'report');--> statement-breakpoint
ALTER TABLE "leads" ALTER COLUMN "attempt_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "source" "lead_source" DEFAULT 'report' NOT NULL;