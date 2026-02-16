CREATE TABLE "career_paths" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"current_role" varchar NOT NULL,
	"experience_years" integer NOT NULL,
	"skills" text[],
	"interests" text[],
	"goals" text[],
	"recommendations" jsonb,
	"pathways" jsonb,
	"next_steps" text[],
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"industry" varchar NOT NULL,
	"location" varchar,
	"description" text,
	"website" varchar,
	"size" varchar,
	"employee_count" varchar,
	"logo_url" varchar,
	"headquarters" varchar,
	"state" varchar,
	"country" varchar DEFAULT 'United States',
	"latitude" varchar,
	"longitude" varchar,
	"status" varchar DEFAULT 'safe' NOT NULL,
	"last_update" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "company_activities" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"description" text NOT NULL,
	"activity_type" varchar NOT NULL,
	"activity_date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "job_applications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"job_title" varchar NOT NULL,
	"company" varchar NOT NULL,
	"location" varchar,
	"salary_range" varchar,
	"job_url" varchar,
	"description" text,
	"status" varchar DEFAULT 'applied',
	"priority" varchar DEFAULT 'medium',
	"applied_date" timestamp DEFAULT now(),
	"interview_date" timestamp,
	"follow_up_date" timestamp,
	"notes" text,
	"contact_person" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "job_search_profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"target_roles" text[],
	"preferred_locations" text[],
	"salary_range" jsonb,
	"experience_level" varchar,
	"work_type" varchar,
	"industries" text[],
	"skills" text[],
	"preferences" jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "layoff_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"title" varchar NOT NULL,
	"description" text,
	"affected_employees" integer,
	"percentage_of_workforce" varchar,
	"affected_job_titles" text[],
	"event_date" timestamp NOT NULL,
	"notice_date" timestamp,
	"effective_date" timestamp,
	"source" varchar,
	"source_type" varchar DEFAULT 'manual' NOT NULL,
	"external_id" varchar,
	"city" varchar,
	"state" varchar,
	"country" varchar DEFAULT 'United States',
	"warn_notice_required" boolean DEFAULT false,
	"warn_notice_date" timestamp,
	"plant_closure" boolean DEFAULT false,
	"funding_stage" varchar,
	"company_valuation" varchar,
	"industry" varchar,
	"is_government_layoff" boolean DEFAULT false,
	"government_department" varchar,
	"layoff_reason" varchar,
	"severity" varchar DEFAULT 'medium',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "magic_link_tokens" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar NOT NULL,
	"token" varchar NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "magic_link_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "network_connections" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"contact_name" varchar NOT NULL,
	"contact_email" varchar,
	"contact_linkedin" varchar,
	"company" varchar,
	"role" varchar,
	"relationship" varchar,
	"connection_source" varchar,
	"notes" text,
	"tags" text[],
	"last_contact" timestamp,
	"follow_up_date" timestamp,
	"connection_strength" varchar DEFAULT 'weak',
	"status" varchar DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"title" varchar NOT NULL,
	"message" text NOT NULL,
	"type" varchar DEFAULT 'info' NOT NULL,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "portfolios" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"title" varchar NOT NULL,
	"tagline" varchar,
	"description" text,
	"template" varchar DEFAULT 'modern',
	"personal_info" jsonb,
	"projects" jsonb,
	"skills" text[],
	"bio" text,
	"experience" jsonb,
	"education" jsonb,
	"is_public" boolean DEFAULT false,
	"custom_domain" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "promotion_plans" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"current_role" varchar NOT NULL,
	"company_type" varchar NOT NULL,
	"years_in_role" varchar NOT NULL,
	"responsibilities" text NOT NULL,
	"career_goal" varchar NOT NULL,
	"linkedin_url" varchar,
	"strategies" jsonb NOT NULL,
	"is_completed" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "salary_research" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"job_title" varchar NOT NULL,
	"location" varchar NOT NULL,
	"experience_level" varchar NOT NULL,
	"current_salary" integer,
	"target_salary" integer,
	"market_data" jsonb,
	"negotiation_strategy" text,
	"strengths" text[],
	"achievements" text[],
	"company_size" varchar,
	"industry" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skills_assessments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"assessment_type" varchar NOT NULL,
	"current_role" varchar,
	"target_role" varchar,
	"skills_to_assess" text[],
	"assessment" jsonb,
	"overall_score" integer,
	"strength_areas" text[],
	"improvement_areas" text[],
	"learning_plan" jsonb,
	"completed_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_company_subscriptions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"company_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"selected_company_id" varchar,
	"phone_number" varchar,
	"job_title" varchar,
	"email_notifications" boolean DEFAULT true,
	"sms_notifications" boolean DEFAULT false,
	"subscription_plan" varchar DEFAULT 'trial',
	"stripe_customer_id" varchar,
	"stripe_subscription_id" varchar,
	"subscription_status" varchar DEFAULT 'trial',
	"subscription_end_date" timestamp,
	"trial_start_date" timestamp,
	"trial_end_date" timestamp,
	"trial_message_limit" integer DEFAULT 5,
	"password" varchar,
	"auth_provider" varchar DEFAULT 'replit',
	"role" varchar DEFAULT 'user',
	"last_login_at" timestamp,
	"is_email_verified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "career_paths" ADD CONSTRAINT "career_paths_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_search_profiles" ADD CONSTRAINT "job_search_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "network_connections" ADD CONSTRAINT "network_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_plans" ADD CONSTRAINT "promotion_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_research" ADD CONSTRAINT "salary_research_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skills_assessments" ADD CONSTRAINT "skills_assessments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");