import {
  users,
  companies,
  layoffEvents,
  layoffs,
  notifications,
  companyActivities,
  userCompanySubscriptions,
  magicLinkTokens,
  promotionPlans,
  type User,
  type UpsertUser,
  type Company,
  type InsertCompany,
  type LayoffEvent,
  type Layoff,
  type InsertLayoffEvent,
  type Notification,
  type InsertNotification,
  type CompanyActivity,
  type InsertCompanyActivity,
  type UpdateUserProfile,
  type InsertMagicLinkToken,
  type MagicLinkToken,
  type SelectPromotionPlan,
  type InsertPromotionPlan,
} from "@shared/schema";
import { db } from "./db";
import { eq, ilike, desc, and, isNull, gte, lte, sql, count } from "drizzle-orm";

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
  getUserByEmail(email: string): Promise<User | undefined>;

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
      byState: byState.filter(item => item.state),
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

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()));
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
    const trialStartDate = new Date();
    const trialEndDate = new Date(trialStartDate.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const [user] = await db
      .insert(users)
      .values({
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        password: userData.password,
        authProvider: userData.authProvider,
        isEmailVerified: userData.isEmailVerified,
        subscriptionPlan: "trial",
        subscriptionStatus: "trial",
        trialStartDate,
        trialEndDate,
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

  // Salary Negotiator methods
  async getSalaryResearch(userId: string): Promise<any[]> {
    return this.salaryResearch.get(userId) || [];
  }

  async createSalaryResearch(userId: string, researchData: any): Promise<any> {
    const research = {
      id: `research_${Date.now()}`,
      userId,
      ...researchData,
      createdAt: new Date().toISOString()
    };

    const userResearch = this.salaryResearch.get(userId) || [];
    userResearch.push(research);
    this.salaryResearch.set(userId, userResearch);

    return research;
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
    return this.networkConnections.get(userId) || [];
  }

  async createNetworkConnection(userId: string, connectionData: any): Promise<any> {
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

  async updateNetworkConnection(userId: string, id: string, updates: any): Promise<any> {
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

  async deleteNetworkConnection(userId: string, id: string): Promise<void> {
    const userConnections = this.networkConnections.get(userId) || [];
    const filteredConnections = userConnections.filter(conn => conn.id !== id);
    this.networkConnections.set(userId, filteredConnections);
  }
}

export const storage = new DatabaseStorage();
