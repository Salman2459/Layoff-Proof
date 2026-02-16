import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  selectedCompanyId: varchar("selected_company_id"),
  phoneNumber: varchar("phone_number"),
  jobTitle: varchar("job_title"),
  emailNotifications: boolean("email_notifications").default(true),
  smsNotifications: boolean("sms_notifications").default(false),
  subscriptionPlan: varchar("subscription_plan").default("trial"), // trial, pro
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  subscriptionStatus: varchar("subscription_status").default("trial"), // trial, active, canceled, past_due
  subscriptionEndDate: timestamp("subscription_end_date"),
  trialStartDate: timestamp("trial_start_date"),
  trialEndDate: timestamp("trial_end_date"),
  trialMessageLimit: integer("trial_message_limit").notNull().default(5),
  password: varchar("password"), // For email/password authentication
  authProvider: varchar("auth_provider").default("replit"), // replit, email, google
  role: varchar("role").default("user"), // user, admin
  lastLoginAt: timestamp("last_login_at"),
  isEmailVerified: boolean("is_email_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Magic link tokens table
export const magicLinkTokens = pgTable("magic_link_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull(),
  token: varchar("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const companies = pgTable("companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  industry: varchar("industry").notNull(),
  location: varchar("location"), // Main location
  description: text("description"),
  website: varchar("website"),
  size: varchar("size"), // Employee count range or "Unknown"
  employeeCount: varchar("employee_count"),
  logoUrl: varchar("logo_url"),
  headquarters: varchar("headquarters"), // City, State  
  state: varchar("state"),
  country: varchar("country").default("United States"),
  latitude: varchar("latitude"),
  longitude: varchar("longitude"),
  status: varchar("status").notNull().default("safe"), // safe, monitoring, active_layoffs
  lastUpdate: timestamp("last_update").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const layoffEvents = pgTable("layoff_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  title: varchar("title").notNull(),
  description: text("description"),
  affectedEmployees: integer("affected_employees"),
  percentageOfWorkforce: varchar("percentage_of_workforce"),
  affectedJobTitles: text("affected_job_titles").array(),
  eventDate: timestamp("event_date").notNull(),
  noticeDate: timestamp("notice_date"), // WARN Act notice date
  effectiveDate: timestamp("effective_date"), // When layoffs actually take effect
  source: varchar("source"),
  sourceType: varchar("source_type").notNull().default("manual"), // "layoffs_fyi", "layoffdata", "warntracker", "manual"
  externalId: varchar("external_id"), // ID from external source

  // Enhanced location and job data
  city: varchar("city"),
  state: varchar("state"),
  country: varchar("country").default("United States"),

  // WARN Act specific fields
  warnNoticeRequired: boolean("warn_notice_required").default(false),
  warnNoticeDate: timestamp("warn_notice_date"),
  plantClosure: boolean("plant_closure").default(false),

  // Company financial data (from layoffs.fyi)
  fundingStage: varchar("funding_stage"), // "Seed", "Series A", "IPO", etc.
  companyValuation: varchar("company_valuation"), // Store as string to avoid bigint issues
  industry: varchar("industry"),

  // Government layoff specific fields
  isGovernmentLayoff: boolean("is_government_layoff").default(false),
  governmentDepartment: varchar("government_department"),
  layoffReason: varchar("layoff_reason"), // "DOGE Layoff", "Restructuring", etc.

  severity: varchar("severity").default("medium"), // low, medium, high, critical
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  type: varchar("type").notNull().default("info"), // info, warning, danger
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const companyActivities = pgTable("company_activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  description: text("description").notNull(),
  activityType: varchar("activity_type").notNull(), // layoff, hiring, earnings, announcement
  activityDate: timestamp("activity_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// User company subscriptions table for paid users
export const userCompanySubscriptions = pgTable("user_company_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  companyId: varchar("company_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  selectedCompany: one(companies, {
    fields: [users.selectedCompanyId],
    references: [companies.id],
  }),
  notifications: many(notifications),
  companySubscriptions: many(userCompanySubscriptions),
}));

export const companiesRelations = relations(companies, ({ many }) => ({
  layoffEvents: many(layoffEvents),
  activities: many(companyActivities),
}));

export const layoffEventsRelations = relations(layoffEvents, ({ one }) => ({
  company: one(companies, {
    fields: [layoffEvents.companyId],
    references: [companies.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const companyActivitiesRelations = relations(companyActivities, ({ one }) => ({
  company: one(companies, {
    fields: [companyActivities.companyId],
    references: [companies.id],
  }),
}));

export const userCompanySubscriptionsRelations = relations(userCompanySubscriptions, ({ one }) => ({
  user: one(users, {
    fields: [userCompanySubscriptions.userId],
    references: [users.id],
  }),
  company: one(companies, {
    fields: [userCompanySubscriptions.companyId],
    references: [companies.id],
  }),
}));

// Insert schemas
export const insertCompanySchema = createInsertSchema(companies).pick({
  name: true,
  industry: true,
  employeeCount: true,
  logoUrl: true,
  headquarters: true,
  state: true,
  country: true,
  latitude: true,
  longitude: true,
  status: true,
});

export const insertLayoffEventSchema = createInsertSchema(layoffEvents).pick({
  companyId: true,
  title: true,
  description: true,
  affectedEmployees: true,
  percentageOfWorkforce: true,
  affectedJobTitles: true,
  eventDate: true,
  source: true,
  severity: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).pick({
  userId: true,
  title: true,
  message: true,
  type: true,
});

export const insertCompanyActivitySchema = createInsertSchema(companyActivities).pick({
  companyId: true,
  description: true,
  activityType: true,
  activityDate: true,
});

export const updateUserProfileSchema = createInsertSchema(users).pick({
  firstName: true,
  lastName: true,
  phoneNumber: true,
  jobTitle: true,
  emailNotifications: true,
  smsNotifications: true,
}).extend({
  email: z.string().email(),
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type InsertMagicLinkToken = typeof magicLinkTokens.$inferInsert;
export type MagicLinkToken = typeof magicLinkTokens.$inferSelect;

// Magic link schemas
export const createMagicLinkSchema = createInsertSchema(magicLinkTokens).pick({
  email: true,
});

// Email/Password authentication schemas
export const signupSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const loginSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
});

export type CreateMagicLinkRequest = z.infer<typeof createMagicLinkSchema>;
export type SignupRequest = z.infer<typeof signupSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;
export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type LayoffEvent = typeof layoffEvents.$inferSelect;
export type InsertLayoffEvent = z.infer<typeof insertLayoffEventSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type CompanyActivity = typeof companyActivities.$inferSelect;
export type InsertCompanyActivity = z.infer<typeof insertCompanyActivitySchema>;
export type UpdateUserProfile = z.infer<typeof updateUserProfileSchema>;
export type UserCompanySubscription = typeof userCompanySubscriptions.$inferSelect;
export type InsertUserCompanySubscription = typeof userCompanySubscriptions.$inferInsert;

// Resume parsing interface
export interface ParsedResumeData {
  name: string;
  email: string;
  phone: string;
  profession: string;
  summary: string;
  experience: Array<{
    title: string;
    company: string;
    duration: string;
    description: string;
    responsibilities: string[];
  }>;
  skills: string[];
  education: Array<{
    degree: string;
    institution: string;
    year: string;
    gpa?: string;
  }>;
  certifications: Array<{
    name: string;
    issuer: string;
    year: string;
  }>;
  achievements: string[];
  projects: Array<{
    name: string;
    description: string;
    technologies: string[];
  }>;
  languages: string[];
  location: string;
  linkedin: string;
  github: string;
  website: string;
}

// Remove duplicate definitions - use the ones defined above

// Promotion Plans table
export const promotionPlans = pgTable("promotion_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  currentRole: varchar("current_role").notNull(),
  companyType: varchar("company_type").notNull(),
  yearsInRole: varchar("years_in_role").notNull(),
  responsibilities: text("responsibilities").notNull(),
  careerGoal: varchar("career_goal").notNull(),
  linkedinUrl: varchar("linkedin_url"),
  strategies: jsonb("strategies").notNull().$type<Array<{
    id: number;
    title: string;
    timeline: string;
    description: string;
    completed: boolean;
  }>>(),
  isCompleted: boolean("is_completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const promotionPlanRelations = relations(promotionPlans, ({ one }) => ({
  user: one(users, { fields: [promotionPlans.userId], references: [users.id] }),
}));

export const layoffs = pgTable("layoffs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  company: varchar("company"),
  date: timestamp("date"),
  employeesLaidOff: integer("employees_laid_off"),
  source: varchar("source"),
  location: varchar("location"),
  industry: varchar("industry"),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLayoffSchema = createInsertSchema(layoffs).pick({
  company: true,
  date: true,
  employeesLaidOff: true,
  source: true,
  location: true,
  industry: true,
  details: true,
});

export type Layoff = typeof layoffs.$inferSelect;
export type InsertLayoff = z.infer<typeof insertLayoffSchema>;



export const insertPromotionPlanSchema = createInsertSchema(promotionPlans).pick({
  currentRole: true,
  companyType: true,
  yearsInRole: true,
  responsibilities: true,
  careerGoal: true,
  linkedinUrl: true,
});

export type SelectPromotionPlan = typeof promotionPlans.$inferSelect;
export type InsertPromotionPlan = z.infer<typeof insertPromotionPlanSchema>;

// Job Search Profiles table
export const jobSearchProfiles = pgTable("job_search_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  targetRoles: text("target_roles").array(),
  preferredLocations: text("preferred_locations").array(),
  salaryRange: jsonb("salary_range").$type<{ min: number; max: number }>(),
  experienceLevel: varchar("experience_level"),
  workType: varchar("work_type"), // remote, hybrid, onsite
  industries: text("industries").array(),
  skills: text("skills").array(),
  preferences: jsonb("preferences"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Job Applications table
export const jobApplications = pgTable("job_applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  jobTitle: varchar("job_title").notNull(),
  company: varchar("company").notNull(),
  location: varchar("location"),
  salaryRange: varchar("salary_range"),
  jobUrl: varchar("job_url"),
  description: text("description"),
  status: varchar("status").default("applied"), // applied, interview, offer, rejected, withdrawn
  priority: varchar("priority").default("medium"), // low, medium, high
  appliedDate: timestamp("applied_date").defaultNow(),
  interviewDate: timestamp("interview_date"),
  followUpDate: timestamp("follow_up_date"),
  notes: text("notes"),
  contactPerson: varchar("contact_person"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Salary Research table
export const salaryResearch = pgTable("salary_research", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  jobTitle: varchar("job_title").notNull(),
  location: varchar("location").notNull(),
  experienceLevel: varchar("experience_level").notNull(),
  currentSalary: integer("current_salary"),
  targetSalary: integer("target_salary"),
  marketData: jsonb("market_data"),
  negotiationStrategy: text("negotiation_strategy"),
  strengths: text("strengths").array(),
  achievements: text("achievements").array(),
  companySize: varchar("company_size"),
  industry: varchar("industry"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Career Paths table
export const careerPaths = pgTable("career_paths", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  currentRole: varchar("current_role").notNull(),
  experienceYears: integer("experience_years").notNull(),
  skills: text("skills").array(),
  interests: text("interests").array(),
  goals: text("goals").array(),
  recommendations: jsonb("recommendations"),
  pathways: jsonb("pathways"),
  nextSteps: text("next_steps").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Skills Assessments table
export const skillsAssessments = pgTable("skills_assessments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  assessmentType: varchar("assessment_type").notNull(), // technical, soft-skills, leadership
  currentRole: varchar("current_role"),
  targetRole: varchar("target_role"),
  skillsToAssess: text("skills_to_assess").array(),
  assessment: jsonb("assessment").$type<Array<{
    skill: string;
    level: number;
    assessment: string;
    recommendations: string[];
  }>>(),
  overallScore: integer("overall_score"),
  strengthAreas: text("strength_areas").array(),
  improvementAreas: text("improvement_areas").array(),
  learningPlan: jsonb("learning_plan"),
  completedAt: timestamp("completed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Portfolios table
export const portfolios = pgTable("portfolios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: varchar("title").notNull(),
  tagline: varchar("tagline"),
  description: text("description"),
  template: varchar("template").default("modern"), // modern, classic, creative
  personalInfo: jsonb("personal_info").$type<{
    name: string;
    email: string;
    phone?: string;
    location?: string;
    website?: string;
    linkedin?: string;
    github?: string;
  }>(),
  projects: jsonb("projects").$type<Array<{
    id: string;
    title: string;
    description: string;
    technologies: string[];
    liveUrl?: string;
    githubUrl?: string;
    imageUrl?: string;
    featured: boolean;
  }>>(),
  skills: text("skills").array(),
  bio: text("bio"),
  experience: jsonb("experience"),
  education: jsonb("education"),
  isPublic: boolean("is_public").default(false),
  customDomain: varchar("custom_domain"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Network Connections table
export const networkConnections = pgTable("network_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  contactName: varchar("contact_name").notNull(),
  contactEmail: varchar("contact_email"),
  contactLinkedIn: varchar("contact_linkedin"),
  company: varchar("company"),
  role: varchar("role"),
  relationship: varchar("relationship"), // colleague, mentor, recruiter, industry-contact
  connectionSource: varchar("connection_source"), // linkedin, event, referral, cold-outreach
  notes: text("notes"),
  tags: text("tags").array(),
  lastContact: timestamp("last_contact"),
  followUpDate: timestamp("follow_up_date"),
  connectionStrength: varchar("connection_strength").default("weak"), // weak, medium, strong
  status: varchar("status").default("active"), // active, dormant, lost-touch
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations for new tables
export const jobSearchProfilesRelations = relations(jobSearchProfiles, ({ one }) => ({
  user: one(users, { fields: [jobSearchProfiles.userId], references: [users.id] }),
}));

export const jobApplicationsRelations = relations(jobApplications, ({ one }) => ({
  user: one(users, { fields: [jobApplications.userId], references: [users.id] }),
}));

export const salaryResearchRelations = relations(salaryResearch, ({ one }) => ({
  user: one(users, { fields: [salaryResearch.userId], references: [users.id] }),
}));

export const careerPathsRelations = relations(careerPaths, ({ one }) => ({
  user: one(users, { fields: [careerPaths.userId], references: [users.id] }),
}));

export const skillsAssessmentsRelations = relations(skillsAssessments, ({ one }) => ({
  user: one(users, { fields: [skillsAssessments.userId], references: [users.id] }),
}));

export const portfoliosRelations = relations(portfolios, ({ one }) => ({
  user: one(users, { fields: [portfolios.userId], references: [users.id] }),
}));

export const networkConnectionsRelations = relations(networkConnections, ({ one }) => ({
  user: one(users, { fields: [networkConnections.userId], references: [users.id] }),
}));

// Insert schemas for new tables
export const insertJobSearchProfileSchema = createInsertSchema(jobSearchProfiles).pick({
  targetRoles: true,
  preferredLocations: true,
  salaryRange: true,
  experienceLevel: true,
  workType: true,
  industries: true,
  skills: true,
  preferences: true,
});

export const insertJobApplicationSchema = createInsertSchema(jobApplications).pick({
  jobTitle: true,
  company: true,
  location: true,
  salaryRange: true,
  jobUrl: true,
  description: true,
  status: true,
  priority: true,
  appliedDate: true,
  interviewDate: true,
  followUpDate: true,
  notes: true,
  contactPerson: true,
});

export const insertSalaryResearchSchema = createInsertSchema(salaryResearch).pick({
  jobTitle: true,
  location: true,
  experienceLevel: true,
  currentSalary: true,
  targetSalary: true,
  strengths: true,
  achievements: true,
  companySize: true,
  industry: true,
});

export const insertCareerPathSchema = createInsertSchema(careerPaths).pick({
  currentRole: true,
  experienceYears: true,
  skills: true,
  interests: true,
  goals: true,
});

export const insertSkillsAssessmentSchema = createInsertSchema(skillsAssessments).pick({
  assessmentType: true,
  currentRole: true,
  targetRole: true,
  skillsToAssess: true,
});

export const insertPortfolioSchema = createInsertSchema(portfolios).pick({
  title: true,
  tagline: true,
  description: true,
  template: true,
  personalInfo: true,
  projects: true,
  skills: true,
  bio: true,
  experience: true,
  education: true,
  isPublic: true,
});

export const insertNetworkConnectionSchema = createInsertSchema(networkConnections).pick({
  contactName: true,
  contactEmail: true,
  contactLinkedIn: true,
  company: true,
  role: true,
  relationship: true,
  connectionSource: true,
  notes: true,
  tags: true,
  lastContact: true,
  followUpDate: true,
  connectionStrength: true,
});

// Types for new tables
export type SelectJobSearchProfile = typeof jobSearchProfiles.$inferSelect;
export type InsertJobSearchProfile = z.infer<typeof insertJobSearchProfileSchema>;

export type SelectJobApplication = typeof jobApplications.$inferSelect;
export type InsertJobApplication = z.infer<typeof insertJobApplicationSchema>;

export type SelectSalaryResearch = typeof salaryResearch.$inferSelect;
export type InsertSalaryResearch = z.infer<typeof insertSalaryResearchSchema>;

export type SelectCareerPath = typeof careerPaths.$inferSelect;
export type InsertCareerPath = z.infer<typeof insertCareerPathSchema>;

export type SelectSkillsAssessment = typeof skillsAssessments.$inferSelect;
export type InsertSkillsAssessment = z.infer<typeof insertSkillsAssessmentSchema>;

export type SelectPortfolio = typeof portfolios.$inferSelect;
export type InsertPortfolio = z.infer<typeof insertPortfolioSchema>;

export type SelectNetworkConnection = typeof networkConnections.$inferSelect;
export type InsertNetworkConnection = z.infer<typeof insertNetworkConnectionSchema>;
