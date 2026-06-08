import {
  users,
  companies,
  layoffEvents,
  layoffs,
  notifications,
  companyActivities,
  userCompanySubscriptions,
  magicLinkTokens,
  passwordResetTokens,
  promotionPlans,
  salaryResearch,
  jobBoardSchema,
  notifyMe,
  networkConnections,
  type User,
  type UpsertUser,
  type Company,
  type InsertCompany,
  type LayoffEvent,
  type Layoff,
  type InsertLayoff,
  type InsertLayoffEvent,
  type Notification,
  type InsertNotification,
  type CompanyActivity,
  type InsertCompanyActivity,
  type UpdateUserProfile,
  type InsertMagicLinkToken,
  type MagicLinkToken,
  type InsertPasswordResetToken,
  type PasswordResetToken,
  type SelectPromotionPlan,
  type InsertPromotionPlan,
  type SelectJobBoard,
  type InsertJobBoard,
  type SelectNotifyMe,
  type InsertNotifyMe,
} from "@shared/schema";
import { db } from "./db";
import { eq, ilike, desc, and, or, isNull, gte, lte, sql, count, type SQL } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserSelectedCompany(userId: string, companyId: string): Promise<void>;
  updateUserProfile(userId: string, profile: UpdateUserProfile): Promise<User>;

  // Company operations
  searchCompanies(query: string): Promise<Company[]>;
  getCompany(id: string): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompanyStatus(companyId: string, status: string): Promise<void>;
  getCompaniesWithLayoffStats(): Promise<{ total: number; recentLayoffs: number }>;

  // Layoff events
  getLayoffEventsByCompany(companyId: string): Promise<LayoffEvent[]>;
  createLayoffEvent(event: InsertLayoffEvent): Promise<LayoffEvent>;
  getHistoricalLayoffData(): Promise<{
    byYear: Array<{ year: number; count: number; employees: number }>;
    byIndustry: Array<{ industry: string; count: number; employees: number }>;
    byState: Array<{ state: string; count: number; employees: number }>;
    byJobTitle: Array<{ jobTitle: string; count: number }>;
  }>;
  getLayoffTrends(timeframe: 'month' | 'quarter' | 'year'): Promise<Array<{ period: string; count: number; employees: number }>>;

  // lay off 
  getLayoffs(): Promise<Layoff[]>;
  createLayoff(l: InsertLayoff): Promise<Layoff>;


  // Notifications
  getUserNotifications(userId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(notificationId: string): Promise<void>;

  // Company activities
  getCompanyActivities(companyId: string): Promise<CompanyActivity[]>;
  createCompanyActivity(activity: InsertCompanyActivity): Promise<CompanyActivity>;

  // Additional methods
  getRecentLayoffs(): Promise<any[]>;
  getAllCompanies(): Promise<Company[]>;

  // Subscription methods
  updateUserSubscription(userId: string, plan: string): Promise<User>;
  updateUserCompanySubscriptions(userId: string, companyIds: string[]): Promise<void>;
  getUserCompanySubscriptions(userId: string): Promise<any[]>;

  // Magic link authentication
  createMagicLinkToken(token: InsertMagicLinkToken): Promise<MagicLinkToken>;
  getMagicLinkToken(token: string): Promise<MagicLinkToken | undefined>;
  useMagicLinkToken(token: string): Promise<void>;

  createPasswordResetToken(
    row: InsertPasswordResetToken,
  ): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  usePasswordResetToken(token: string): Promise<void>;
  deletePasswordResetToken(token: string): Promise<void>;
  invalidateUnusedPasswordResetTokensForUser(userId: string): Promise<void>;

  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined>;

  // Email/password authentication
  createEmailUser(userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    authProvider: string;
    isEmailVerified: boolean;
  }): Promise<User>;
  updateUserLastLogin(userId: string): Promise<void>;
  updateUser(userId: string, updates: Partial<User>): Promise<User>;

  // Admin operations
  getCompanyCount(): Promise<number>;
  getUserCount(): Promise<number>;
  getLayoffCount(): Promise<number>;
  getActiveMonitoringCount(): Promise<number>;
  getAllUsers(): Promise<User[]>;
  updateCompany(id: string, updates: Partial<Company>): Promise<Company>;
  deleteCompany(id: string): Promise<void>;
  getAllLayoffs(): Promise<LayoffEvent[]>;

  // Promotion planner methods
  getCurrentPromotionPlan(userId: string): Promise<SelectPromotionPlan | null>;
  createPromotionPlan(planData: InsertPromotionPlan & { userId: string; strategies: any[] }): Promise<SelectPromotionPlan>;
  updatePromotionPlanProgress(planId: string, userId: string, strategies: any[]): Promise<SelectPromotionPlan>;

  // Career tools methods
  // Job Search Optimizer
  getJobSearchProfile(userId: string): Promise<any>;
  createOrUpdateJobSearchProfile(userId: string, profileData: any): Promise<any>;
  getJobApplications(userId: string): Promise<any[]>;
  createJobApplication(userId: string, applicationData: any): Promise<any>;
  updateJobApplication(userId: string, id: string, updates: any): Promise<any>;
  deleteJobApplication(userId: string, id: string): Promise<void>;

  // Salary Negotiator
  getSalaryResearch(userId: string): Promise<any[]>;
  createSalaryResearch(userId: string, researchData: any): Promise<any>;
  deleteSalaryResearch(userId: string, id: string): Promise<void>;

  // Career Path Analyzer
  getCareerPaths(userId: string): Promise<any[]>;
  createCareerPath(userId: string, pathData: any): Promise<any>;

  // Skills Assessment
  getSkillsAssessments(userId: string): Promise<any[]>;
  createSkillsAssessment(userId: string, assessmentData: any): Promise<any>;

  // Portfolio Builder
  getPortfolio(userId: string): Promise<any>;
  createPortfolio(userId: string, portfolioData: any): Promise<any>;
  updatePortfolio(userId: string, id: string, updates: any): Promise<any>;

  // Networking Assistant
  getNetworkConnections(userId: string): Promise<any[]>;
  createNetworkConnection(userId: string, connectionData: any): Promise<any>;
  updateNetworkConnection(userId: string, id: string, updates: any): Promise<any>;
  deleteNetworkConnection(userId: string, id: string): Promise<void>;

  // Job Board
  getJobBoardPosts(
    userId: string,
    limit: number,
    page: number,
    search?: string | null,
  ): Promise<SelectJobBoard[]>;
  getJobBoardPostsCount(userId: string, search?: string | null): Promise<number>;
  getAllJobBoardPosts(userId: string, search?: string | null): Promise<SelectJobBoard[]>;
  createJobBoardPost(userId: string, post: InsertJobBoard): Promise<SelectJobBoard>;

  // Notify Me
  createNotifyMe(userId: string, data: InsertNotifyMe): Promise<SelectNotifyMe>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserSelectedCompany(userId: string, companyId: string): Promise<void> {
    await db
      .update(users)
      .set({ selectedCompanyId: companyId, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async updateUserProfile(userId: string, profile: UpdateUserProfile): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...profile,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Company operations
  async searchCompanies(query: string): Promise<Company[]> {
    return await db
      .select()
      .from(companies)
      .where(ilike(companies.name, `%${query}%`))
      .limit(10);
  }

  async getCompany(id: string): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company;
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const [newCompany] = await db.insert(companies).values(company).returning();
    return newCompany;
  }

  async updateCompanyStatus(companyId: string, status: string): Promise<void> {
    await db
      .update(companies)
      .set({ status, lastUpdate: new Date() })
      .where(eq(companies.id, companyId));
  }

  async getCompaniesWithLayoffStats(): Promise<{ total: number; recentLayoffs: number }> {
    const totalCompanies = await db.select().from(companies);
    const recentLayoffs = await db
      .select()
      .from(layoffEvents)
      .where(
        and(
          eq(layoffEvents.eventDate, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
        )
      );

    return {
      total: totalCompanies.length,
      recentLayoffs: recentLayoffs.length,
    };
  }

  // Layoff events
  async getLayoffEventsByCompany(companyId: string): Promise<LayoffEvent[]> {
    return await db
      .select()
      .from(layoffEvents)
      .where(eq(layoffEvents.companyId, companyId))
      .orderBy(desc(layoffEvents.eventDate));
  }


  async createLayoffEvent(event: InsertLayoffEvent): Promise<LayoffEvent> {
    const [newEvent] = await db.insert(layoffEvents).values(event).returning();
    return newEvent;
  }


  async getLayoffs(): Promise<Layoff[]> {
    return await db
      .select()
      .from(layoffs)
      .orderBy(desc(layoffs.date))
      .limit(200);
  }

  async createLayoff(l: InsertLayoff): Promise<Layoff> {
    const [newLayoff] = await db.insert(layoffs).values(l).returning();
    return newLayoff;
  }

  async getHistoricalLayoffData(): Promise<{
    byYear: Array<{ year: number; count: number; employees: number }>;
    byIndustry: Array<{ industry: string; count: number; employees: number }>;
    byState: Array<{ state: string; count: number; employees: number }>;
    byJobTitle: Array<{ jobTitle: string; count: number }>;
  }> {
    // By Year
    const byYear = await db
      .select({
        year: sql<number>`EXTRACT(YEAR FROM ${layoffEvents.eventDate})`,
        count: count(),
        employees: sql<number>`COALESCE(SUM(${layoffEvents.affectedEmployees}), 0)`,
      })
      .from(layoffEvents)
      .groupBy(sql`EXTRACT(YEAR FROM ${layoffEvents.eventDate})`)
      .orderBy(sql`EXTRACT(YEAR FROM ${layoffEvents.eventDate}) DESC`);

    // By Industry
    const byIndustry = await db
      .select({
        industry: companies.industry,
        count: count(),
        employees: sql<number>`COALESCE(SUM(${layoffEvents.affectedEmployees}), 0)`,
      })
      .from(layoffEvents)
      .innerJoin(companies, eq(layoffEvents.companyId, companies.id))
      .groupBy(companies.industry)
      .orderBy(desc(count()));

    // By State
    const byState = await db
      .select({
        state: companies.state,
        count: count(),
        employees: sql<number>`COALESCE(SUM(${layoffEvents.affectedEmployees}), 0)`,
      })
      .from(layoffEvents)
      .innerJoin(companies, eq(layoffEvents.companyId, companies.id))
      .where(sql`${companies.state} IS NOT NULL`)
      .groupBy(companies.state)
      .orderBy(desc(count()));

    // By Job Title (from affected job titles array)
    const byJobTitle = await db
      .select({
        jobTitle: sql<string>`unnest(${layoffEvents.affectedJobTitles})`,
        count: count(),
      })
      .from(layoffEvents)
      .where(sql`${layoffEvents.affectedJobTitles} IS NOT NULL`)
      .groupBy(sql`unnest(${layoffEvents.affectedJobTitles})`)
      .orderBy(desc(count()));

    return {
      byYear,
      byIndustry,
      byState: byState.filter(
        (item): item is { state: string; count: number; employees: number } => Boolean(item.state),
      ),
      byJobTitle,
    };
  }

  async getLayoffTrends(timeframe: 'month' | 'quarter' | 'year'): Promise<Array<{ period: string; count: number; employees: number }>> {
    let dateFormat: string;
    let dateTrunc: string;

    switch (timeframe) {
      case 'month':
        dateFormat = 'YYYY-MM';
        dateTrunc = 'month';
        break;
      case 'quarter':
        dateFormat = 'YYYY-Q';
        dateTrunc = 'quarter';
        break;
      case 'year':
        dateFormat = 'YYYY';
        dateTrunc = 'year';
        break;
    }

    const trends = await db
      .select({
        period: sql<string>`TO_CHAR(DATE_TRUNC('${sql.raw(dateTrunc)}', ${layoffEvents.eventDate}), '${sql.raw(dateFormat)}')`,
        count: count(),
        employees: sql<number>`COALESCE(SUM(${layoffEvents.affectedEmployees}), 0)`,
      })
      .from(layoffEvents)
      .groupBy(sql`DATE_TRUNC('${sql.raw(dateTrunc)}', ${layoffEvents.eventDate})`)
      .orderBy(sql`DATE_TRUNC('${sql.raw(dateTrunc)}', ${layoffEvents.eventDate}) DESC`)
      .limit(12);

    return trends;
  }

  // Notifications
  async getUserNotifications(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(
        userId ? eq(notifications.userId, userId) : isNull(notifications.userId)
      )
      .orderBy(desc(notifications.createdAt))
      .limit(10);
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, notificationId));
  }

  // Company activities
  async getCompanyActivities(companyId: string): Promise<CompanyActivity[]> {
    return await db
      .select()
      .from(companyActivities)
      .where(eq(companyActivities.companyId, companyId))
      .orderBy(desc(companyActivities.activityDate))
      .limit(10);
  }

  async createCompanyActivity(activity: InsertCompanyActivity): Promise<CompanyActivity> {
    const [newActivity] = await db.insert(companyActivities).values(activity).returning();
    return newActivity;
  }

  // Recent layoffs
  async getRecentLayoffs(): Promise<any[]> {
    const layoffs = await db
      .select({
        id: layoffEvents.id,
        title: layoffEvents.title,
        description: layoffEvents.description,
        affectedEmployees: layoffEvents.affectedEmployees,
        eventDate: layoffEvents.eventDate,
        severity: layoffEvents.severity,
        company: companies.name,
      })
      .from(layoffEvents)
      .innerJoin(companies, eq(layoffEvents.companyId, companies.id))
      .orderBy(desc(layoffEvents.eventDate))
      .limit(20);
    return layoffs;
  }

  // Get all companies - this method is already defined below in admin section

  // Subscription methods

  async updateUserCompanySubscriptions(userId: string, companyIds: string[]): Promise<void> {
    // First, delete existing subscriptions
    await db.delete(userCompanySubscriptions).where(eq(userCompanySubscriptions.userId, userId));

    // Then insert new subscriptions
    if (companyIds.length > 0) {
      const subscriptions = companyIds.map(companyId => ({
        userId,
        companyId,
      }));
      await db.insert(userCompanySubscriptions).values(subscriptions);
    }
  }

  async getUserCompanySubscriptions(userId: string): Promise<any[]> {
    const subscriptions = await db
      .select({
        id: userCompanySubscriptions.id,
        userId: userCompanySubscriptions.userId,
        companyId: userCompanySubscriptions.companyId,
        companyName: companies.name,
        companyIndustry: companies.industry,
        companyStatus: companies.status,
        createdAt: userCompanySubscriptions.createdAt,
      })
      .from(userCompanySubscriptions)
      .innerJoin(companies, eq(userCompanySubscriptions.companyId, companies.id))
      .where(eq(userCompanySubscriptions.userId, userId));

    return subscriptions;
  }

  // Admin operations - removed duplicate getAllUsers method

  async getAllCompanies(): Promise<Company[]> {
    return await db.select().from(companies);
  }



  async updateUserSubscription(userId: string, plan: string, status: string = "active"): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        subscriptionPlan: plan,
        subscriptionStatus: status,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Magic link authentication methods
  async createMagicLinkToken(tokenData: InsertMagicLinkToken): Promise<MagicLinkToken> {
    const [token] = await db
      .insert(magicLinkTokens)
      .values(tokenData)
      .returning();
    return token;
  }

  async getMagicLinkToken(token: string): Promise<MagicLinkToken | undefined> {
    const [magicToken] = await db
      .select()
      .from(magicLinkTokens)
      .where(eq(magicLinkTokens.token, token));
    return magicToken;
  }

  async useMagicLinkToken(token: string): Promise<void> {
    await db
      .update(magicLinkTokens)
      .set({ usedAt: new Date() })
      .where(eq(magicLinkTokens.token, token));
  }

  async createPasswordResetToken(
    row: InsertPasswordResetToken,
  ): Promise<PasswordResetToken> {
    const [created] = await db
      .insert(passwordResetTokens)
      .values(row)
      .returning();
    return created;
  }

  async getPasswordResetToken(
    token: string,
  ): Promise<PasswordResetToken | undefined> {
    const [row] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));
    return row;
  }

  async usePasswordResetToken(token: string): Promise<void> {
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.token, token));
  }

  async deletePasswordResetToken(token: string): Promise<void> {
    await db
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));
  }

  async invalidateUnusedPasswordResetTokensForUser(
    userId: string,
  ): Promise<void> {
    await db
      .delete(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.userId, userId),
          isNull(passwordResetTokens.usedAt),
        ),
      );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const normalized = email.trim().toLowerCase();
    const [user] = await db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = ${normalized}`);
    return user;
  }

  async getUserByStripeCustomerId(
    stripeCustomerId: string,
  ): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.stripeCustomerId, stripeCustomerId));
    return user;
  }

  // Email/password authentication methods
  async createEmailUser(userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    authProvider: string;
    isEmailVerified: boolean;
  }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        password: userData.password,
        authProvider: userData.authProvider,
        isEmailVerified: userData.isEmailVerified,
        subscriptionPlan: "free",
        subscriptionStatus: "inactive",
        lastLoginAt: new Date(),
      })
      .returning();
    return user;
  }

  async updateUserLastLogin(userId: string): Promise<void> {
    await db
      .update(users)
      .set({
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Admin operations implementation
  async getCompanyCount(): Promise<number> {
    const result = await db.select({ count: count() }).from(companies);
    return result[0]?.count || 0;
  }

  async getUserCount(): Promise<number> {
    const result = await db.select({ count: count() }).from(users);
    return result[0]?.count || 0;
  }

  async getLayoffCount(): Promise<number> {
    const result = await db.select({ count: count() }).from(layoffEvents);
    return result[0]?.count || 0;
  }

  async getActiveMonitoringCount(): Promise<number> {
    const result = await db.select({ count: count() })
      .from(companies)
      .where(eq(companies.status, 'monitoring'));
    return result[0]?.count || 0;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async updateCompany(id: string, updates: Partial<Company>): Promise<Company> {
    const [company] = await db
      .update(companies)
      .set(updates)
      .where(eq(companies.id, id))
      .returning();
    return company;
  }

  async deleteCompany(id: string): Promise<void> {
    await db.delete(companies).where(eq(companies.id, id));
  }

  async getAllLayoffs(): Promise<LayoffEvent[]> {
    return await db.select().from(layoffEvents).orderBy(desc(layoffEvents.eventDate)).limit(100);
  }

  // Promotion planner methods
  async getCurrentPromotionPlan(userId: string): Promise<SelectPromotionPlan | null> {
    const [plan] = await db
      .select()
      .from(promotionPlans)
      .where(and(eq(promotionPlans.userId, userId), eq(promotionPlans.isCompleted, false)))
      .orderBy(desc(promotionPlans.createdAt))
      .limit(1);

    return plan || null;
  }

  async createPromotionPlan(planData: InsertPromotionPlan & { userId: string; strategies: any[] }): Promise<SelectPromotionPlan> {
    const [plan] = await db
      .insert(promotionPlans)
      .values(planData)
      .returning();

    return plan;
  }

  async updatePromotionPlanProgress(planId: string, userId: string, strategies: any[]): Promise<SelectPromotionPlan> {
    const [plan] = await db
      .update(promotionPlans)
      .set({
        strategies,
        updatedAt: new Date(),
        isCompleted: strategies.every(s => s.completed)
      })
      .where(and(eq(promotionPlans.id, planId), eq(promotionPlans.userId, userId)))
      .returning();

    return plan;
  }

  // Career tools implementations - using in-memory storage for now
  private jobSearchProfiles = new Map<string, any>();
  private jobApplications = new Map<string, any[]>();
  private salaryResearch = new Map<string, any[]>();
  private careerPaths = new Map<string, any[]>();
  private skillsAssessments = new Map<string, any[]>();
  private portfolios = new Map<string, any>();
  private networkConnections = new Map<string, any[]>();

  // Job Search Optimizer methods
  async getJobSearchProfile(userId: string): Promise<any> {
    return this.jobSearchProfiles.get(userId) || null;
  }

  async createOrUpdateJobSearchProfile(userId: string, profileData: any): Promise<any> {
    const profile = {
      id: `profile_${Date.now()}`,
      userId,
      ...profileData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.jobSearchProfiles.set(userId, profile);
    return profile;
  }

  async getJobApplications(userId: string): Promise<any[]> {
    return this.jobApplications.get(userId) || [];
  }

  async createJobApplication(userId: string, applicationData: any): Promise<any> {
    const application = {
      id: `app_${Date.now()}`,
      userId,
      ...applicationData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const userApplications = this.jobApplications.get(userId) || [];
    userApplications.push(application);
    this.jobApplications.set(userId, userApplications);

    return application;
  }

  async updateJobApplication(userId: string, id: string, updates: any): Promise<any> {
    const userApplications = this.jobApplications.get(userId) || [];
    const index = userApplications.findIndex(app => app.id === id);

    if (index === -1) {
      throw new Error('Application not found');
    }

    userApplications[index] = {
      ...userApplications[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.jobApplications.set(userId, userApplications);
    return userApplications[index];
  }

  async deleteJobApplication(userId: string, id: string): Promise<void> {
    const userApplications = this.jobApplications.get(userId) || [];
    const filteredApplications = userApplications.filter(app => app.id !== id);
    this.jobApplications.set(userId, filteredApplications);
  }

  // Job Board methods (DB-backed)
  private jobBoardSearchWhere(userId: string, search?: string | null): SQL {
    const userScope = eq(jobBoardSchema.userId, userId);
    const trimmed = typeof search === "string" ? search.trim() : "";
    if (!trimmed) return userScope;
    const pattern = `%${trimmed}%`;
    return and(
      userScope,
      or(
        ilike(jobBoardSchema.platform, pattern),
        ilike(jobBoardSchema.jobTitle, pattern),
        ilike(jobBoardSchema.companyName, pattern),
        ilike(jobBoardSchema.jobLocation, pattern),
        ilike(jobBoardSchema.jobType, pattern),
        ilike(jobBoardSchema.jobDescription, pattern),
        ilike(jobBoardSchema.salaryRange, pattern),
        ilike(jobBoardSchema.companyLink, pattern),
      )!,
    )!;
  }

  async getJobBoardPosts(
    userId: string,
    limit: number,
    page: number,
    search?: string | null,
  ): Promise<SelectJobBoard[]> {
    return await db
      .select()
      .from(jobBoardSchema)
      .where(this.jobBoardSearchWhere(userId, search))
      .orderBy(desc(jobBoardSchema.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);
  }

  async getJobBoardPostsCount(userId: string, search?: string | null): Promise<number> {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(jobBoardSchema)
      .where(this.jobBoardSearchWhere(userId, search));
    return count ?? 0;
  }

  async getAllJobBoardPosts(
    userId: string,
    search?: string | null,
  ): Promise<SelectJobBoard[]> {
    return await db
      .select()
      .from(jobBoardSchema)
      .where(this.jobBoardSearchWhere(userId, search))
      .orderBy(desc(jobBoardSchema.createdAt));
  }

  async createJobBoardPost(userId: string, post: InsertJobBoard): Promise<SelectJobBoard> {
    const [row] = await db
      .insert(jobBoardSchema)
      .values({
        userId,
        ...post,
        updatedAt: new Date(),
      })
      .returning();

    if (!row) throw new Error("Failed to create job board post");
    return row;
  }

  async createNotifyMe(userId: string, data: InsertNotifyMe): Promise<SelectNotifyMe> {
    const company = String((data as any).company || "").trim();
    const email = String(data.email || "").trim();
    const role = String(data.role || "").trim();
    const status = data.status ?? "pending";

    if (!company) throw new Error("Missing company");

    // If user already added this email, throw a conflict error.
    const existing = await db
      .select()
      .from(notifyMe)
      .where(and(eq(notifyMe.userId, userId), eq(notifyMe.email, email)))
      .limit(1);

    if (existing.length > 0) {
      const err: any = new Error("User has already added with this email");
      err.code = "DUPLICATE_NOTIFY_EMAIL";
      throw err;
    }

    const [created] = await db
      .insert(notifyMe)
      .values({
        userId,
        company,
        email,
        role,
        status,
        updatedAt: new Date(),
      })
      .returning();

    if (!created) throw new Error("Failed to create notify me");
    return created;
  }

  // Salary Negotiator methods
  async getSalaryResearch(userId: string): Promise<any[]> {
    // Prefer DB persistence when available; fallback to in-memory map.
    try {
      return await db
        .select()
        .from(salaryResearch)
        .where(eq(salaryResearch.userId, userId))
        .orderBy(desc(salaryResearch.createdAt));
    } catch (e) {
      console.warn("Falling back to in-memory salary research:", e);
      return this.salaryResearch.get(userId) || [];
    }
  }

  async createSalaryResearch(userId: string, researchData: any): Promise<any> {
    try {
      const [row] = await db
        .insert(salaryResearch)
        .values({
          userId,
          ...researchData,
          updatedAt: new Date(),
        })
        .returning();
      return row;
    } catch (e) {
      console.warn("Falling back to in-memory salary research create:", e);
      const research = {
        id: `research_${Date.now()}`,
        userId,
        ...researchData,
        createdAt: new Date().toISOString(),
      };

      const userResearch = this.salaryResearch.get(userId) || [];
      userResearch.push(research);
      this.salaryResearch.set(userId, userResearch);

      return research;
    }
  }

  async deleteSalaryResearch(userId: string, id: string): Promise<void> {
    try {
      await db
        .delete(salaryResearch)
        .where(and(eq(salaryResearch.userId, userId), eq(salaryResearch.id, id)));
      return;
    } catch (e) {
      console.warn("Falling back to in-memory salary research delete:", e);
      const userResearch = this.salaryResearch.get(userId) || [];
      this.salaryResearch.set(
        userId,
        userResearch.filter((r: any) => r?.id !== id),
      );
    }
  }

  // Career Path Analyzer methods
  async getCareerPaths(userId: string): Promise<any[]> {
    return this.careerPaths.get(userId) || [];
  }

  async createCareerPath(userId: string, pathData: any): Promise<any> {
    const path = {
      id: `path_${Date.now()}`,
      userId,
      ...pathData,
      createdAt: new Date().toISOString()
    };

    const userPaths = this.careerPaths.get(userId) || [];
    userPaths.push(path);
    this.careerPaths.set(userId, userPaths);

    return path;
  }

  // Skills Assessment methods
  async getSkillsAssessments(userId: string): Promise<any[]> {
    return this.skillsAssessments.get(userId) || [];
  }

  async createSkillsAssessment(userId: string, assessmentData: any): Promise<any> {
    const assessment = {
      id: `assessment_${Date.now()}`,
      userId,
      ...assessmentData,
      createdAt: new Date().toISOString()
    };

    const userAssessments = this.skillsAssessments.get(userId) || [];
    userAssessments.push(assessment);
    this.skillsAssessments.set(userId, userAssessments);

    return assessment;
  }

  // Portfolio Builder methods
  async getPortfolio(userId: string): Promise<any> {
    return this.portfolios.get(userId) || null;
  }

  async createPortfolio(userId: string, portfolioData: any): Promise<any> {
    const portfolio = {
      id: `portfolio_${Date.now()}`,
      userId,
      ...portfolioData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.portfolios.set(userId, portfolio);
    return portfolio;
  }

  async updatePortfolio(userId: string, id: string, updates: any): Promise<any> {
    const portfolio = this.portfolios.get(userId);

    if (!portfolio || portfolio.id !== id) {
      throw new Error('Portfolio not found');
    }

    const updatedPortfolio = {
      ...portfolio,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.portfolios.set(userId, updatedPortfolio);
    return updatedPortfolio;
  }

  // Networking Assistant methods
  async getNetworkConnections(userId: string): Promise<any[]> {
    try {
      return await db
        .select()
        .from(networkConnections)
        .where(eq(networkConnections.userId, userId))
        .orderBy(desc(networkConnections.createdAt));
    } catch (e) {
      console.warn("Falling back to in-memory network connections:", e);
      return this.networkConnections.get(userId) || [];
    }
  }

  async createNetworkConnection(userId: string, connectionData: any): Promise<any> {
    try {
      const toDateOrNull = (v: any) => {
        if (!v) return null;
        const d = v instanceof Date ? v : new Date(String(v));
        return Number.isNaN(d.getTime()) ? null : d;
      };

      const [row] = await db
        .insert(networkConnections)
        .values({
          userId,
          contactName: String(connectionData?.contactName || "").trim(),
          contactEmail: connectionData?.contactEmail ? String(connectionData.contactEmail).trim() : null,
          contactLinkedIn: connectionData?.contactLinkedIn ? String(connectionData.contactLinkedIn).trim() : null,
          company: connectionData?.company ? String(connectionData.company).trim() : null,
          role: connectionData?.role ? String(connectionData.role).trim() : null,
          relationship: connectionData?.relationship ? String(connectionData.relationship).trim() : null,
          connectionSource: connectionData?.connectionSource ? String(connectionData.connectionSource).trim() : null,
          notes: connectionData?.notes ? String(connectionData.notes).trim() : null,
          tags: Array.isArray(connectionData?.tags) ? connectionData.tags.map((t: any) => String(t || "").trim()).filter(Boolean) : null,
          lastContact: toDateOrNull(connectionData?.lastContact),
          followUpDate: toDateOrNull(connectionData?.followUpDate),
          connectionStrength: connectionData?.connectionStrength ? String(connectionData.connectionStrength).trim() : "weak",
          status: connectionData?.status ? String(connectionData.status).trim() : "active",
          updatedAt: new Date(),
        })
        .returning();

      return row;
    } catch (e) {
      console.warn("Falling back to in-memory network connection create:", e);
      const connection = {
        id: `connection_${Date.now()}`,
        userId,
        ...connectionData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const userConnections = this.networkConnections.get(userId) || [];
      userConnections.push(connection);
      this.networkConnections.set(userId, userConnections);

      return connection;
    }
  }

  async updateNetworkConnection(userId: string, id: string, updates: any): Promise<any> {
    try {
      const toDateOrNull = (v: any) => {
        if (!v) return null;
        const d = v instanceof Date ? v : new Date(String(v));
        return Number.isNaN(d.getTime()) ? null : d;
      };

      const patch: any = {
        updatedAt: new Date(),
      };
      if ("contactName" in (updates || {})) patch.contactName = String(updates.contactName || "").trim();
      if ("contactEmail" in (updates || {})) patch.contactEmail = updates.contactEmail ? String(updates.contactEmail).trim() : null;
      if ("contactLinkedIn" in (updates || {})) patch.contactLinkedIn = updates.contactLinkedIn ? String(updates.contactLinkedIn).trim() : null;
      if ("company" in (updates || {})) patch.company = updates.company ? String(updates.company).trim() : null;
      if ("role" in (updates || {})) patch.role = updates.role ? String(updates.role).trim() : null;
      if ("relationship" in (updates || {})) patch.relationship = updates.relationship ? String(updates.relationship).trim() : null;
      if ("connectionSource" in (updates || {})) patch.connectionSource = updates.connectionSource ? String(updates.connectionSource).trim() : null;
      if ("notes" in (updates || {})) patch.notes = updates.notes ? String(updates.notes).trim() : null;
      if ("tags" in (updates || {})) patch.tags = Array.isArray(updates.tags) ? updates.tags.map((t: any) => String(t || "").trim()).filter(Boolean) : null;
      if ("lastContact" in (updates || {})) patch.lastContact = toDateOrNull(updates.lastContact);
      if ("followUpDate" in (updates || {})) patch.followUpDate = toDateOrNull(updates.followUpDate);
      if ("connectionStrength" in (updates || {})) patch.connectionStrength = updates.connectionStrength ? String(updates.connectionStrength).trim() : null;
      if ("status" in (updates || {})) patch.status = updates.status ? String(updates.status).trim() : null;

      const [row] = await db
        .update(networkConnections)
        .set(patch)
        .where(and(eq(networkConnections.userId, userId), eq(networkConnections.id, id)))
        .returning();

      if (!row) throw new Error("Connection not found");
      return row;
    } catch (e) {
      console.warn("Falling back to in-memory network connection update:", e);
      const userConnections = this.networkConnections.get(userId) || [];
      const index = userConnections.findIndex(conn => conn.id === id);

      if (index === -1) {
        throw new Error('Connection not found');
      }

      userConnections[index] = {
        ...userConnections[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };

      this.networkConnections.set(userId, userConnections);
      return userConnections[index];
    }
  }

  async deleteNetworkConnection(userId: string, id: string): Promise<void> {
    try {
      await db
        .delete(networkConnections)
        .where(and(eq(networkConnections.userId, userId), eq(networkConnections.id, id)));
      return;
    } catch (e) {
      console.warn("Falling back to in-memory network connection delete:", e);
      const userConnections = this.networkConnections.get(userId) || [];
      const filteredConnections = userConnections.filter(conn => conn.id !== id);
      this.networkConnections.set(userId, filteredConnections);
    }
  }
}

export const storage = new DatabaseStorage();
