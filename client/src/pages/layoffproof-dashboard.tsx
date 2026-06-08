import { Link } from "wouter";
import {
  ChevronRight,
  TrendingUp,
  ArrowRight,
  Calendar,
  Loader2,
  MapPin,
  Users,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { LayoffProofLayout } from "@/components/layoffproof/LayoffProofLayout";
import { LayoffProofDashboardHeader } from "@/components/layoffproof/LayoffProofDashboardHeader";
import { LayoffProofHeroIllustration } from "@/components/layoffproof/LayoffProofHeroIllustration";
import { layoffProofToolCards } from "@/components/layoffproof/layoffproof-nav";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { RecentActivityList } from "@/components/layoffproof/RecentActivityList";
import {
  DASHBOARD_ACTIVITY_PREVIEW,
  type RecentActivitiesResponse,
} from "@/lib/recentActivities";
import {
  profileStrengthBarColor,
  profileStrengthColor,
  type UserDashboardMetrics,
} from "@/lib/dashboardMetrics";
import { cn } from "@/lib/utils";

type TrackerLayoff = {
  id: string;
  company: string | null;
  date: string | null;
  employeesLaidOff: number | null;
  location: string | null;
  industry: string | null;
  role: string | null;
  details: string | null;
};

type LayoffsApiResponse = {
  success: boolean;
  data: {
    layoffs: TrackerLayoff[];
  };
};

const LAYOFF_LOGO_STYLES = [
  { logoBg: "bg-white border border-slate-200", logoColor: "text-blue-600" },
  { logoBg: "bg-[#6366f1]", logoColor: "text-white" },
  { logoBg: "bg-[#f97316]", logoColor: "text-white" },
  { logoBg: "bg-[#10b981]", logoColor: "text-white" },
  { logoBg: "bg-[#8b5cf6]", logoColor: "text-white" },
];

function formatLayoffDate(date?: string | null): string {
  if (!date) return "Date unknown";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "Date unknown";
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function layoffSubtitle(layoff: TrackerLayoff): string {
  return layoff.location?.trim() || layoff.role?.trim() || layoff.details?.trim() || "—";
}

function firstName(first?: string | null, last?: string | null): string {
  return first?.trim() || last?.trim() || "there";
}

export default function LayoffProofDashboard() {
  const { user, isAuthenticated } = useAuth();
  const previewFetchLimit = DASHBOARD_ACTIVITY_PREVIEW + 1;
  const { data: activitiesData, isLoading: activitiesLoading } = useQuery<RecentActivitiesResponse>({
    queryKey: [`/api/user/recent-activities?limit=${previewFetchLimit}`],
    enabled: isAuthenticated,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
  const { data: metrics, isLoading: metricsLoading } = useQuery<UserDashboardMetrics>({
    queryKey: ["/api/user/dashboard-metrics"],
    enabled: isAuthenticated,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
  const { data: layoffsData, isLoading: layoffsLoading } = useQuery<LayoffsApiResponse>({
    queryKey: ["/api/layoffs", "dashboard-preview"],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: "1",
        limit: "5",
        category: "all",
      });
      const res = await fetch(`/api/layoffs?${params}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error("Failed to fetch layoffs");
      }
      return res.json();
    },
    enabled: isAuthenticated,
    staleTime: 60_000,
  });
  const previewLayoffs = layoffsData?.data?.layoffs ?? [];
  const allFetched = activitiesData?.activities ?? [];
  const recentActivities = allFetched.slice(0, DASHBOARD_ACTIVITY_PREVIEW);
  const hasMoreActivities = allFetched.length > DASHBOARD_ACTIVITY_PREVIEW;

  const greeting = firstName(user?.firstName, user?.lastName);

  return (
    <LayoffProofLayout activeNavId="dashboard">
      <LayoffProofDashboardHeader greeting={greeting} />

      <main className="flex-1 px-8 py-6">
        <div className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_340px]">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#6366f1] via-[#7c3aed] to-[#4338ca] p-8 shadow-xl shadow-indigo-200/40">
            <div className="relative z-10 flex flex-col justify-between gap-6 sm:flex-row">
              <div className="max-w-md">
                <h2 className="text-2xl font-bold tracking-tight text-white sm:text-[26px]">
                  Your AI Career Copilot
                </h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {["Smart", "Fast", "Effective"].map((tag, i) => (
                    <span key={tag} className="text-xs font-medium text-indigo-100">
                      {tag}
                      {i < 2 && <span className="mx-1.5 text-indigo-300/80">•</span>}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-indigo-100/95">
                  Create a standout resume, optimize LinkedIn, auto apply to jobs and land more
                  interviews.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/profile"
                    className="inline-flex h-10 items-center rounded-lg bg-white px-5 text-sm font-semibold text-[#4f46e5] no-underline shadow-md transition hover:bg-indigo-50"
                  >
                    Optimize My Profile
                  </Link>
                  <Link
                    href="/job-board"
                    className="inline-flex h-10 items-center rounded-lg border border-white/40 bg-white/10 px-5 text-sm font-semibold text-white no-underline backdrop-blur-sm transition hover:bg-white/20"
                  >
                    Check Job Matches
                  </Link>
                </div>
              </div>
              <LayoffProofHeroIllustration />
            </div>
            <div
              className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"
              aria-hidden
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <StatCard
              label="Applications"
              value={metricsLoading ? "—" : String(metrics?.applications.value ?? 0)}
              trend={
                metrics?.applications.trendPercent != null
                  ? `${metrics.applications.trendPercent}%`
                  : undefined
              }
              trendUp={metrics?.applications.trendUp ?? false}
              caption="vs last 30 days"
            />
            <StatCard
              label="Interviews"
              value={metricsLoading ? "—" : String(metrics?.interviews.value ?? 0)}
              trend={
                metrics?.interviews.trendPercent != null
                  ? `${metrics.interviews.trendPercent}%`
                  : undefined
              }
              trendUp={metrics?.interviews.trendUp ?? false}
              caption="vs last 30 days"
            />
            <div className="rounded-2xl border border-[#e8ecf4] bg-white p-5 shadow-sm">
              <p className="text-xs font-medium text-[#64748b]">Profile Strength</p>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-[#0f172a]">
                  {metricsLoading ? "—" : `${metrics?.profileStrength.percent ?? 0}%`}
                </span>
                <span
                  className={cn(
                    "text-xs font-semibold",
                    profileStrengthColor(metrics?.profileStrength.percent ?? 0)
                  )}
                >
                  {metricsLoading ? "…" : metrics?.profileStrength.label ?? "Needs work"}
                </span>
              </div>
              <Progress
                value={metrics?.profileStrength.percent ?? 0}
                className={cn(
                  "mt-3 h-2 bg-[#e2e8f0]",
                  profileStrengthBarColor(metrics?.profileStrength.percent ?? 0)
                )}
              />
            </div>
            <StatCard
              label="Jobs Saved"
              value={metricsLoading ? "—" : String(metrics?.jobsSaved.value ?? 0)}
              caption="vs last 30 days"
            />
          </div>
        </div>

        <section className="mb-6">
          <h3 className="mb-4 text-lg font-bold text-[#0f172a]">All Tools</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {layoffProofToolCards.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.id}
                  href={tool.href}
                  className={cn(
                    "group relative flex min-h-[128px] flex-col rounded-2xl border border-[#e8ecf4] bg-white p-4 no-underline shadow-sm transition hover:border-[#c7d2fe] hover:shadow-md",
                    tool.popular && "pb-8"
                  )}
                >
                    {tool.popular && (
                      <span className="absolute bottom-3 left-4 rounded-md bg-[#eef2ff] px-2 py-0.5 text-[10px] font-semibold text-[#6366f1]">
                        Popular
                      </span>
                    )}
                    <div
                      className={cn(
                        "mb-3 flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm",
                        tool.iconBg
                      )}
                    >
                      <Icon className="h-5 w-5" strokeWidth={2} />
                    </div>
                    <h4 className="pr-6 text-sm font-semibold text-[#1e293b]">{tool.title}</h4>
                    <p className="mt-1 flex-1 text-[11px] leading-snug text-[#64748b]">
                      {tool.description}
                    </p>
                    <ChevronRight className="absolute right-3 top-4 h-4 w-4 text-[#cbd5e1] transition group-hover:text-[#6366f1]" />
                </Link>
              );
            })}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#e8ecf4] bg-white p-6 shadow-sm flex flex-col justify-between">
            <div>
            <h3 className="text-base font-bold text-[#0f172a]">Recent Activity</h3>
            <ul className="mt-5 space-y-4">
              <RecentActivityList
                activities={recentActivities}
                isLoading={activitiesLoading}
              />
            </ul>
            </div>
            {hasMoreActivities ? (
              <Link
                href="/all-activities"
                className="mt-5 ml-auto flex items-center gap-1 text-sm font-semibold text-[#6366f1] no-underline transition hover:text-[#4f46e5]"
              >
                View All Activity
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : null}
          </div>

          <div className="rounded-2xl border border-[#e8ecf4] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#0f172a]">Recent Layoffs</h3>
              <Link
                href="/lay-offs"
                className="text-xs font-semibold text-[#6366f1] no-underline hover:text-[#4f46e5]"
              >
                View All
              </Link>
            </div>
            <ul className="mt-5 space-y-4">
              {layoffsLoading ? (
                <li className="flex items-center justify-center py-8 text-sm text-[#64748b]">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin text-[#6366f1]" />
                  Loading layoffs…
                </li>
              ) : previewLayoffs.length > 0 ? (
                previewLayoffs.map((layoff, index) => {
                  const logoStyle =
                    LAYOFF_LOGO_STYLES[index % LAYOFF_LOGO_STYLES.length];
                  const initial = (layoff.company?.trim()?.[0] ?? "?").toUpperCase();

                  return (
                    <li
                      key={layoff.id}
                      className="flex gap-3 border-b border-[#f1f5f9] pb-4 last:border-0 last:pb-0"
                    >
                      <div
                        className={cn(
                          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-bold shadow-sm",
                          logoStyle.logoBg,
                          logoStyle.logoColor,
                        )}
                      >
                        {initial}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-[#1e293b]">
                              {layoff.company}
                            </p>
                            <p className="mt-0.5 flex items-center gap-1 line-clamp-1 text-[11px] text-[#64748b]">
                              {layoff.location ? (
                                <MapPin className="h-3 w-3 shrink-0" />
                              ) : null}
                              {layoffSubtitle(layoff)}
                            </p>
                          </div>
                          {layoff.employeesLaidOff != null ? (
                            <span className="shrink-0 rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-600">
                              {layoff.employeesLaidOff.toLocaleString()} affected
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className="inline-flex items-center gap-1 rounded-md bg-[#f1f5f9] px-2 py-0.5 text-[10px] font-medium text-[#64748b]">
                            <Calendar className="h-3 w-3" />
                            {formatLayoffDate(layoff.date)}
                          </span>
                          {layoff.industry ? (
                            <span className="rounded-md bg-[#f1f5f9] px-2 py-0.5 text-[10px] font-medium capitalize text-[#64748b]">
                              {layoff.industry}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  );
                })
              ) : (
                <li className="flex flex-col items-center justify-center gap-2 py-8 text-center text-sm text-[#64748b]">
                  <Users className="h-8 w-8 text-[#cbd5e1]" />
                  <p>No recent layoffs to show yet.</p>
                  <Link
                    href="/lay-offs"
                    className="text-xs font-semibold text-[#6366f1] no-underline hover:text-[#4f46e5]"
                  >
                    Open job tracker
                  </Link>
                </li>
              )}
            </ul>
          </div>
        </div>
      </main>
    </LayoffProofLayout>
  );
}

function StatCard({
  label,
  value,
  trend,
  trendUp,
  caption,
  className,
}: {
  label: string;
  value: string;
  trend?: string;
  trendUp?: boolean;
  caption?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[#e8ecf4] bg-white p-5 shadow-sm",
        className
      )}
    >
      <p className="text-xs font-medium text-[#64748b]">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[#0f172a]">{value}</p>
      {trend && (
        <p
          className={cn(
            "mt-1 flex items-center gap-0.5 text-[11px] font-semibold",
            trendUp ? "text-emerald-600" : "text-red-500"
          )}
        >
          {trendUp ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingUp className="h-3 w-3 rotate-180" />
          )}
          {trendUp ? "↑" : "↓"} {trend} {caption}
        </p>
      )}
      {!trend && caption && (
        <p className="mt-1 text-[11px] text-[#94a3b8]">{caption}</p>
      )}
    </div>
  );
}
