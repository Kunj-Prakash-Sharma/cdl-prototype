CREATE TYPE "public"."lead_contact_role" AS ENUM('learner', 'parent');--> statement-breakpoint
CREATE TYPE "public"."lead_preferred_time" AS ENUM('morning', 'afternoon', 'evening');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('new', 'contacted', 'closed');--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"attempt_id" uuid NOT NULL,
	"phone" text NOT NULL,
	"contact_role" "lead_contact_role" NOT NULL,
	"preferred_time" "lead_preferred_time",
	"consent_at" timestamp with time zone NOT NULL,
	"consent_version" text NOT NULL,
	"status" "lead_status" DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status_changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "leads_one_new_per_user" ON "leads" USING btree ("user_id") WHERE "leads"."status" = 'new';--> statement-breakpoint
CREATE INDEX "leads_status_created_idx" ON "leads" USING btree ("status","created_at");