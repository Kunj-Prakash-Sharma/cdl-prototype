ALTER TABLE "auth_user" ADD COLUMN "isAnonymous" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "auth_user" ADD COLUMN "linkedUserId" text;