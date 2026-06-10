CREATE TABLE IF NOT EXISTS "affiliates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"referral_code" varchar NOT NULL,
	"status" varchar DEFAULT 'approved' NOT NULL,
	"commission_amount" integer DEFAULT 49 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "affiliates_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "affiliates_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "referrals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"affiliate_id" varchar NOT NULL,
	"referred_user_id" varchar NOT NULL,
	"referral_code" varchar NOT NULL,
	"status" varchar DEFAULT 'signed_up' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "referrals_referred_user_id_unique" UNIQUE("referred_user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "affiliate_commissions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"affiliate_id" varchar NOT NULL,
	"customer_id" varchar NOT NULL,
	"subscription_id" varchar,
	"amount" integer DEFAULT 49 NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"eligible_at" timestamp NOT NULL,
	"approved_at" timestamp,
	"paid_at" timestamp,
	"reversed_at" timestamp,
	"reversal_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "affiliates" ADD CONSTRAINT "affiliates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_affiliate_id_affiliates_id_fk" FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliates"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_user_id_users_id_fk" FOREIGN KEY ("referred_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "affiliate_commissions" ADD CONSTRAINT "affiliate_commissions_affiliate_id_affiliates_id_fk" FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliates"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "affiliate_commissions" ADD CONSTRAINT "affiliate_commissions_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "IDX_affiliates_user" ON "affiliates" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "IDX_affiliates_referral_code" ON "affiliates" USING btree ("referral_code");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "IDX_referrals_affiliate" ON "referrals" USING btree ("affiliate_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "IDX_referrals_referred_user" ON "referrals" USING btree ("referred_user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "IDX_affiliate_commissions_affiliate" ON "affiliate_commissions" USING btree ("affiliate_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "IDX_affiliate_commissions_customer" ON "affiliate_commissions" USING btree ("customer_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "IDX_affiliate_commissions_status" ON "affiliate_commissions" USING btree ("status");
