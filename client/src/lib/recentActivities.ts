import { formatDistanceToNow } from "date-fns";
import type { LucideIcon } from "lucide-react";
import {
  Send,
  Linkedin,
  FileCheck,
  Bookmark,
  Sparkles,
  UserPlus,
  Bell,
  User,
  Bot,
  Mail,
  Briefcase,
  Users,
  BarChart3,
  Award,
  MessageCircle,
} from "lucide-react";

const TOOL_UI: Record<string, { icon: LucideIcon; iconBg: string }> = {
  "auto-apply": { icon: Bot, iconBg: "bg-violet-100 text-violet-600" },
  "resume-builder": { icon: FileCheck, iconBg: "bg-emerald-100 text-emerald-600" },
  linkedin: { icon: Linkedin, iconBg: "bg-blue-100 text-blue-600" },
  "cover-letter": { icon: Mail, iconBg: "bg-rose-100 text-rose-600" },
  "job-tracker": { icon: Briefcase, iconBg: "bg-amber-100 text-amber-600" },
  interview: { icon: Users, iconBg: "bg-cyan-100 text-cyan-600" },
  "recruiter-outreach": { icon: BarChart3, iconBg: "bg-fuchsia-100 text-fuchsia-600" },
  skills: { icon: Award, iconBg: "bg-orange-100 text-orange-600" },
  career: { icon: MessageCircle, iconBg: "bg-indigo-100 text-indigo-600" },
  networking: { icon: UserPlus, iconBg: "bg-sky-100 text-sky-600" },
  "job-search": { icon: Briefcase, iconBg: "bg-amber-100 text-amber-600" },
  salary: { icon: Sparkles, iconBg: "bg-teal-100 text-teal-600" },
  portfolio: { icon: FileCheck, iconBg: "bg-slate-100 text-slate-600" },
};

/** Preview count on the /app dashboard Recent Activity card. */
export const DASHBOARD_ACTIVITY_PREVIEW = 8;

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

export type UserActivityFeedItem = {
  id: string;
  type: UserActivityType;
  title: string;
  detail?: string | null;
  metadata?: Record<string, unknown> | null;
  occurredAt: string;
};

export type RecentActivitiesResponse = {
  activities: UserActivityFeedItem[];
};

export function formatActivityTime(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return "";
  }
}

export function activityDisplay(item: UserActivityFeedItem): {
  icon: LucideIcon;
  iconBg: string;
  lines: { bold?: string; text: string }[];
} {
  const jobTitle =
    typeof item.metadata?.jobTitle === "string" ? item.metadata.jobTitle : null;
  const company =
    typeof item.metadata?.company === "string"
      ? item.metadata.company
      : item.detail ?? null;
  const score =
    typeof item.metadata?.score === "number" ? item.metadata.score : null;

  switch (item.type) {
    case "job_applied":
      return {
        icon: Send,
        iconBg: "bg-violet-100 text-violet-600",
        lines: jobTitle && company
          ? [
              { text: "Applied to " },
              { text: jobTitle, bold: jobTitle },
              { text: " at " },
              { text: company, bold: company },
            ]
          : [{ text: item.title }],
      };
    case "job_saved":
      return {
        icon: Bookmark,
        iconBg: "bg-amber-100 text-amber-600",
        lines: jobTitle && company
          ? [
              { text: "Saved " },
              { text: jobTitle, bold: jobTitle },
              { text: " at " },
              { text: company, bold: company },
            ]
          : [{ text: item.title }],
      };
    case "linkedin_optimized":
      return {
        icon: Linkedin,
        iconBg: "bg-blue-100 text-blue-600",
        lines: [{ text: item.title }],
      };
    case "resume_analyzed":
    case "resume_uploaded":
      return {
        icon: FileCheck,
        iconBg: "bg-emerald-100 text-emerald-600",
        lines: score != null
          ? [
              { text: "Resume analyzed — " },
              { text: `ATS score ${score}%`, bold: `ATS score ${score}%` },
            ]
          : [{ text: item.title }],
      };
    case "connection_added":
      return {
        icon: UserPlus,
        iconBg: "bg-sky-100 text-sky-600",
        lines: [{ text: item.title }],
      };
    case "job_alert_set":
      return {
        icon: Bell,
        iconBg: "bg-orange-100 text-orange-600",
        lines: [{ text: item.title }],
      };
    case "profile_updated":
      return {
        icon: User,
        iconBg: "bg-indigo-100 text-indigo-600",
        lines: [{ text: item.title }],
      };
    case "tool_used": {
      const toolId =
        typeof item.metadata?.toolId === "string" ? item.metadata.toolId : "";
      const toolUi = toolId ? TOOL_UI[toolId] : undefined;
      return {
        icon: toolUi?.icon ?? Sparkles,
        iconBg: toolUi?.iconBg ?? "bg-indigo-100 text-indigo-600",
        lines: [{ text: item.title }],
      };
    }
    default:
      return {
        icon: Sparkles,
        iconBg: "bg-indigo-100 text-indigo-600",
        lines: [{ text: item.title }],
      };
  }
}
