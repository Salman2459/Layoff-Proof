import type { Request } from "express";
import { db } from "./db";
import { storage } from "./storage";
import {
  userActivities,
  userDocuments,
  userJobProfiles,
  notifyMe,
  networkConnections,
  jobBoardSchema,
} from "@shared/schema";
import { eq, desc, and, sql, ne, gte, lt } from "drizzle-orm";
import { getJwtSecret, verifyJwt } from "./jwt";

export type UserActivityType =
  | "job_applied"
  | "job_saved"
  | "resume_uploaded"
  | "profile_updated"
  | "linkedin_optimized"
  | "resume_analyzed"
  | "connection_added"
  | "job_alert_set"
  | "tool_used";

/** Default titles when a LayoffProof tool is used (see layoffproof-nav tool ids). */
export const LAYOFFPROOF_TOOL_EVENTS: Record<string, { title: string }> = {
  "auto-apply": { title: "Updated AI Auto Apply profile" },
  "resume-builder": { title: "Used Resume Builder" },
  linkedin: { title: "Used LinkedIn Optimizer" },
  "cover-letter": { title: "Generated AI cover letter" },
  "job-tracker": { title: "Updated job tracker" },
  interview: { title: "Used Interview Prep" },
  "recruiter-outreach": { title: "Used Resume Analyzer / outreach" },
  skills: { title: "Completed Skills Boost assessment" },
  career: { title: "Used Career Assistant" },
  networking: { title: "Generated networking message" },
  "job-search": { title: "Updated job search preferences" },
  salary: { title: "Ran salary negotiation research" },
  portfolio: { title: "Updated portfolio" },
};

export type UserActivityFeedItem = {
  id: string;
  type: UserActivityType;
  title: string;
  detail?: string | null;
  metadata?: Record<string, unknown> | null;
  occurredAt: string;
};

type RecordActivityInput = {
  type: UserActivityType;
  title: string;
  detail?: string | null;
  metadata?: Record<string, unknown> | null;
  occurredAt?: Date;
  /** Stable id for deduplication (e.g. job-board:uuid). */
  sourceId?: string;
};

export async function resolveRequestUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.authorization || (req.headers as { Authorization?: string }).Authorization;
  if (typeof authHeader === "string" && authHeader.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice("bearer ".length).trim();
    const payload = verifyJwt(token, getJwtSecret());
    const userId = typeof payload?.sub === "string" ? payload.sub : null;
    if (userId) {
      const user = await storage.getUser(userId);
      if (user) return user.id;
    }
  }

  const sessionUser = (req.session as { user?: { id?: string } })?.user;
  if (sessionUser?.id) {
    const user = await storage.getUser(sessionUser.id);
    if (user) return user.id;
  }

  const replitUser = (req as Request & { user?: { claims?: { sub?: string }; id?: string } }).user;
  if (replitUser?.claims?.sub) {
    const user = await storage.getUser(replitUser.claims.sub);
    if (user) return user.id;
  }
  if (replitUser?.id) {
    return replitUser.id;
  }

  return null;
}

/** Session/JWT user, or explicit user id from request body (many tools pass `id`). */
export async function resolveActivityUserId(
  req: Request,
  bodyUserId?: string | null,
): Promise<string | null> {
  const fromAuth = await resolveRequestUserId(req);
  if (fromAuth) return fromAuth;
  if (typeof bodyUserId === "string" && bodyUserId.trim()) {
    const user = await storage.getUser(bodyUserId.trim());
    return user?.id ?? bodyUserId.trim();
  }
  return null;
}

export async function recordLayoffProofTool(
  userId: string,
  toolId: string,
  overrides?: Partial<RecordActivityInput>,
): Promise<void> {
  const config = LAYOFFPROOF_TOOL_EVENTS[toolId];
  await recordUserActivity(userId, {
    type: overrides?.type ?? "tool_used",
    title: overrides?.title ?? config?.title ?? "Used Layoff Proof tool",
    detail: overrides?.detail ?? null,
    metadata: { toolId, ...(overrides?.metadata ?? {}) },
    sourceId: overrides?.sourceId ?? `${toolId}:${Date.now()}`,
    occurredAt: overrides?.occurredAt,
  });
}

export async function logLayoffProofTool(
  req: Request,
  toolId: string,
  options?: { bodyUserId?: string | null } & Partial<RecordActivityInput>,
): Promise<void> {
  const { bodyUserId, ...overrides } = options ?? {};
  const userId = await resolveActivityUserId(req, bodyUserId);
  if (!userId) return;
  await recordLayoffProofTool(userId, toolId, overrides);
}

async function activityExistsForSource(userId: string, sourceId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: userActivities.id })
    .from(userActivities)
    .where(
      and(
        eq(userActivities.userId, userId),
        sql`${userActivities.metadata}->>'sourceId' = ${sourceId}`,
      ),
    )
    .limit(1);
  return !!row;
}

export async function recordUserActivity(
  userId: string,
  activity: RecordActivityInput,
): Promise<void> {
  try {
    if (activity.sourceId && (await activityExistsForSource(userId, activity.sourceId))) {
      return;
    }

    const metadata = {
      ...(activity.metadata ?? {}),
      ...(activity.sourceId ? { sourceId: activity.sourceId } : {}),
    };

    await db.insert(userActivities).values({
      userId,
      activityType: activity.type,
      title: activity.title,
      detail: activity.detail ?? null,
      metadata: Object.keys(metadata).length > 0 ? metadata : null,
      occurredAt: activity.occurredAt ?? new Date(),
    });
  } catch (error) {
    console.error("Failed to record user activity:", error);
  }
}

export async function recordUserActivityFromRequest(
  req: Request,
  activity: RecordActivityInput,
): Promise<void> {
  const userId = await resolveRequestUserId(req);
  if (!userId) return;
  await recordUserActivity(userId, activity);
}

function toIso(date: Date | string | null | undefined): string {
  if (!date) return new Date().toISOString();
  return date instanceof Date ? date.toISOString() : new Date(date).toISOString();
}

/** Read feed only from user_activities. */
export async function getRecentUserActivities(
  userId: string,
  limit = 15,
): Promise<UserActivityFeedItem[]> {
  const rows = await db
    .select()
    .from(userActivities)
    .where(
      and(
        eq(userActivities.userId, userId),
        ne(userActivities.activityType, "job_saved"),
      ),
    )
    .orderBy(desc(userActivities.occurredAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    type: row.activityType as UserActivityType,
    title: row.title,
    detail: row.detail,
    metadata: row.metadata ?? null,
    occurredAt: toIso(row.occurredAt),
  }));
}

export type DashboardMetricTrend = {
  value: number;
  previousValue: number;
  trendPercent: number | null;
  trendUp: boolean;
};

export type UserDashboardMetrics = {
  applications: DashboardMetricTrend;
  interviews: DashboardMetricTrend;
  jobsSaved: { value: number };
  profileStrength: { percent: number; label: string };
};

function periodBounds() {
  const now = new Date();
  const currentStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const previousStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  return { now, currentStart, previousStart };
}

function inDateRange(
  value: Date | string | null | undefined,
  from: Date,
  to: Date,
): boolean {
  if (!value) return false;
  const t = new Date(value).getTime();
  return t >= from.getTime() && t < to.getTime();
}

function calcTrend(current: number, previous: number): DashboardMetricTrend {
  let trendPercent: number | null = null;
  let trendUp = current >= previous;
  if (previous > 0) {
    const change = Math.round(((current - previous) / previous) * 100);
    trendPercent = Math.abs(change);
    trendUp = change >= 0;
  } else if (current > 0) {
    trendPercent = 100;
    trendUp = true;
  }
  return { value: current, previousValue: previous, trendPercent, trendUp };
}

function profileStrengthLabel(percent: number): string {
  if (percent < 40) return "Needs work";
  if (percent < 85) return "Good";
  return "Excellent";
}

async function countActivitiesInRange(
  userId: string,
  activityType: UserActivityType,
  from: Date,
  to: Date,
): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(userActivities)
    .where(
      and(
        eq(userActivities.userId, userId),
        eq(userActivities.activityType, activityType),
        gte(userActivities.occurredAt, from),
        lt(userActivities.occurredAt, to),
      ),
    );
  return row?.count ?? 0;
}

async function countSavedJobsInRange(
  userId: string,
  from: Date,
  to: Date,
): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(jobBoardSchema)
    .where(
      and(
        eq(jobBoardSchema.userId, userId),
        gte(jobBoardSchema.createdAt, from),
        lt(jobBoardSchema.createdAt, to),
      ),
    );
  return row?.count ?? 0;
}

export async function getUserDashboardMetrics(
  userId: string,
): Promise<UserDashboardMetrics> {
  const { now, currentStart, previousStart } = periodBounds();

  const [
    appliedActivitiesCurrent,
    appliedActivitiesPrevious,
    savedActivitiesCurrent,
    jobBoardSavedCurrent,
    profileRow,
    trackerApplications,
  ] = await Promise.all([
    countActivitiesInRange(userId, "job_applied", currentStart, now),
    countActivitiesInRange(userId, "job_applied", previousStart, currentStart),
    countActivitiesInRange(userId, "job_saved", currentStart, now),
    countSavedJobsInRange(userId, currentStart, now),
    db
      .select({ profileCompletion: userJobProfiles.profileCompletion })
      .from(userJobProfiles)
      .where(eq(userJobProfiles.userId, userId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    storage.getJobApplications(userId),
  ]);

  const trackerAppliedCurrent = trackerApplications.filter((app) =>
    inDateRange(app.appliedDate ?? app.createdAt, currentStart, now),
  ).length;
  const trackerAppliedPrevious = trackerApplications.filter((app) =>
    inDateRange(app.appliedDate ?? app.createdAt, previousStart, currentStart),
  ).length;

  const applicationsCurrent = Math.max(
    appliedActivitiesCurrent,
    trackerAppliedCurrent,
  );
  const applicationsPrevious = Math.max(
    appliedActivitiesPrevious,
    trackerAppliedPrevious,
  );

  const interviewsCurrent = trackerApplications.filter((app) => {
    const status = String(app.status ?? "").toLowerCase();
    if (status !== "interview" && status !== "offer") return false;
    return inDateRange(
      app.interviewDate ?? app.updatedAt ?? app.appliedDate ?? app.createdAt,
      currentStart,
      now,
    );
  }).length;

  const interviewsPrevious = trackerApplications.filter((app) => {
    const status = String(app.status ?? "").toLowerCase();
    if (status !== "interview" && status !== "offer") return false;
    return inDateRange(
      app.interviewDate ?? app.updatedAt ?? app.appliedDate ?? app.createdAt,
      previousStart,
      currentStart,
    );
  }).length;

  const jobsSavedCurrent = Math.max(savedActivitiesCurrent, jobBoardSavedCurrent);

  const profilePercent = Math.min(
    100,
    Math.max(0, profileRow?.profileCompletion ?? 0),
  );

  return {
    applications: calcTrend(applicationsCurrent, applicationsPrevious),
    interviews: calcTrend(interviewsCurrent, interviewsPrevious),
    jobsSaved: { value: jobsSavedCurrent },
    profileStrength: {
      percent: profilePercent,
      label: profileStrengthLabel(profilePercent),
    },
  };
}

/** One-time import of historical rows from other tables into user_activities. */
export async function backfillLegacyUserActivities(userId: string): Promise<number> {
  let inserted = 0;

  const docs = await db
    .select()
    .from(userDocuments)
    .where(eq(userDocuments.userId, userId))
    .orderBy(desc(userDocuments.uploadedAt));

  for (const doc of docs) {
    const sourceId = `document:${doc.id}`;
    if (await activityExistsForSource(userId, sourceId)) continue;
    const label =
      doc.documentType === "resume"
        ? "Resume uploaded"
        : doc.documentType === "certificate"
          ? "Certificate uploaded"
          : "Document uploaded";
    await recordUserActivity(userId, {
      type: "resume_uploaded",
      title: label,
      detail: doc.fileName,
      metadata: { documentType: doc.documentType, fileName: doc.fileName },
      occurredAt: doc.uploadedAt
        ? new Date(doc.uploadedAt)
        : doc.createdAt
          ? new Date(doc.createdAt)
          : new Date(),
      sourceId,
    });
    inserted++;
  }

  const alerts = await db
    .select()
    .from(notifyMe)
    .where(eq(notifyMe.userId, userId))
    .orderBy(desc(notifyMe.createdAt));

  for (const alert of alerts) {
    const sourceId = `notify:${alert.id}`;
    if (await activityExistsForSource(userId, sourceId)) continue;
    await recordUserActivity(userId, {
      type: "job_alert_set",
      title: `Set alert for ${alert.role}`,
      detail: alert.company,
      metadata: { company: alert.company, role: alert.role },
      occurredAt: alert.createdAt ? new Date(alert.createdAt) : new Date(),
      sourceId,
    });
    inserted++;
  }

  const connections = await db
    .select()
    .from(networkConnections)
    .where(eq(networkConnections.userId, userId))
    .orderBy(desc(networkConnections.createdAt));

  for (const conn of connections) {
    const sourceId = `connection:${conn.id}`;
    if (await activityExistsForSource(userId, sourceId)) continue;
    await recordUserActivity(userId, {
      type: "connection_added",
      title: `Added ${conn.contactName}`,
      detail: conn.company ?? conn.role ?? null,
      metadata: { contactName: conn.contactName, company: conn.company },
      occurredAt: conn.createdAt ? new Date(conn.createdAt) : new Date(),
      sourceId,
    });
    inserted++;
  }

  const [profile] = await db
    .select()
    .from(userJobProfiles)
    .where(eq(userJobProfiles.userId, userId))
    .limit(1);

  if (profile?.updatedAt && profile.createdAt) {
    const updatedMs = new Date(profile.updatedAt).getTime();
    const createdMs = new Date(profile.createdAt).getTime();
    const sourceId = `profile:${profile.id}`;
    if (updatedMs - createdMs > 60_000 && !(await activityExistsForSource(userId, sourceId))) {
      await recordUserActivity(userId, {
        type: "profile_updated",
        title: "Updated job profile",
        detail:
          profile.profileCompletion != null
            ? `Profile strength ${profile.profileCompletion}%`
            : null,
        metadata: { profileCompletion: profile.profileCompletion },
        occurredAt: new Date(profile.updatedAt),
        sourceId,
      });
      inserted++;
    }
  }

  const applications = await storage.getJobApplications(userId);
  for (const app of applications) {
    const sourceId = `application:${app.id}`;
    if (await activityExistsForSource(userId, sourceId)) continue;
    await recordUserActivity(userId, {
      type: "job_applied",
      title: `Applied to ${app.jobTitle}`,
      detail: app.company,
      metadata: { jobTitle: app.jobTitle, company: app.company, status: app.status },
      occurredAt: app.appliedDate
        ? new Date(app.appliedDate)
        : app.createdAt
          ? new Date(app.createdAt)
          : new Date(),
      sourceId,
    });
    inserted++;
  }

  return inserted;
}
