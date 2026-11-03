CREATE TYPE "public"."chat_attempt_status" AS ENUM('in_progress', 'completed', 'invalid', 'abandoned');--> statement-breakpoint
CREATE TABLE "chat_answers" (
	"attempt_id" uuid NOT NULL,
	"question_id" text NOT NULL,
	"variant_id" text,
	"value" smallint NOT NULL,
	"answered_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chat_answers_attempt_id_question_id_pk" PRIMARY KEY("attempt_id","question_id")
);
--> statement-breakpoint
CREATE TABLE "chat_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"set_version" text NOT NULL,
	"status" "chat_attempt_status" DEFAULT 'in_progress' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_answer_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "chat_results" (
	"attempt_id" uuid PRIMARY KEY NOT NULL,
	"set_version" text NOT NULL,
	"scores" jsonb NOT NULL,
	"holland" text,
	"holland_close" boolean DEFAULT false NOT NULL,
	"flat" boolean DEFAULT false NOT NULL,
	"stage_status" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat_answers" ADD CONSTRAINT "chat_answers_attempt_id_chat_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."chat_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_attempts" ADD CONSTRAINT "chat_attempts_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_results" ADD CONSTRAINT "chat_results_attempt_id_chat_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."chat_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_attempts_user_idx" ON "chat_attempts" USING btree ("user_id","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "chat_attempts_one_open_per_user" ON "chat_attempts" USING btree ("user_id") WHERE "chat_attempts"."status" = 'in_progress';