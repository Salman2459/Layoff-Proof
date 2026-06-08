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

export function profileStrengthColor(percent: number): string {
  if (percent < 40) return "text-amber-600";
  if (percent < 85) return "text-emerald-600";
  return "text-emerald-600";
}

export function profileStrengthBarColor(percent: number): string {
  if (percent < 40) return "[&>div]:bg-amber-500";
  if (percent < 85) return "[&>div]:bg-emerald-500";
  return "[&>div]:bg-emerald-500";
}
