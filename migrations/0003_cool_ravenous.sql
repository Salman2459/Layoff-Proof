CREATE TABLE "user_documents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"profile_id" varchar,
	"document_type" varchar NOT NULL,
	"file_name" varchar NOT NULL,
	"file_url" varchar NOT NULL,
	"file_size" integer,
	"mime_type" varchar,
	"document_title" varchar,
	"issuer" varchar,
	"issue_date" timestamp,
	"uploaded_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_job_profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"first_name" varchar,
	"last_name" varchar,
	"email" varchar,
	"phone" varchar,
	"phone_code" varchar,
	"linkedin" varchar,
	"twitter" varchar,
	"website" varchar,
	"github" varchar,
	"street" varchar,
	"building_no" varchar,
	"apartment_no" varchar,
	"country" varchar,
	"city" varchar,
	"zip" varchar,
	"authorized_countries" text[],
	"sponsorship" varchar,
	"relocate" varchar,
	"total_experience" varchar,
	"skills" jsonb,
	"languages" jsonb,
	"education" jsonb,
	"expected_salary" integer,
	"expected_salary_currency" varchar,
	"current_salary" integer,
	"current_salary_currency" varchar,
	"notice_period" integer,
	"start_date" timestamp,
	"race" varchar,
	"disability" varchar,
	"veteran" varchar,
	"achievements" text,
	"profile_completion" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "user_documents" ADD CONSTRAINT "user_documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_documents" ADD CONSTRAINT "user_documents_profile_id_user_job_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."user_job_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_job_profiles" ADD CONSTRAINT "user_job_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;