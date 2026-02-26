ALTER TABLE "user_job_profiles" ADD COLUMN "certificates" text;--> statement-breakpoint
ALTER TABLE "user_job_profiles" ADD COLUMN "recommendation_letter" text;--> statement-breakpoint
ALTER TABLE "user_job_profiles" ADD COLUMN "resume" text;--> statement-breakpoint
ALTER TABLE "user_job_profiles" ADD COLUMN "current_step" integer DEFAULT 0;