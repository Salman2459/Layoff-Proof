CREATE TABLE "layoffs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company" varchar,
	"date" timestamp,
	"employees_laid_off" integer,
	"source" varchar,
	"location" varchar,
	"industry" varchar,
	"details" text,
	"created_at" timestamp DEFAULT now()
);
