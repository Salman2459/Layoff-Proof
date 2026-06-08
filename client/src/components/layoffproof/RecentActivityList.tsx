import { Loader2 } from "lucide-react";
import {
  activityDisplay,
  formatActivityTime,
  type UserActivityFeedItem,
} from "@/lib/recentActivities";
import { cn } from "@/lib/utils";

type RecentActivityListProps = {
  activities: UserActivityFeedItem[];
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
};

export function RecentActivityList({
  activities,
  isLoading = false,
  emptyMessage = "No recent activity yet. Use Layoff Proof tools to see updates here.",
  className,
}: RecentActivityListProps) {
  if (isLoading) {
    return (
      <li className="flex items-center justify-center gap-2 py-8 text-sm text-[#94a3b8]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading activity…
      </li>
    );
  }

  if (activities.length === 0) {
    return (
      <li className="py-6 text-center text-[13px] text-[#94a3b8]">{emptyMessage}</li>
    );
  }

  return (
    <>
      {activities.map((item) => {
        const display = activityDisplay(item);
        const Icon = display.icon;
        return (
          <li key={item.id} className={cn("flex gap-3", className)}>
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                display.iconBg
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1 border-b border-[#f1f5f9] pb-4 last:border-0 last:pb-0">
              <p className="text-[13px] leading-snug text-[#64748b]">
                {display.lines.map((line, i) =>
                  line.bold ? (
                    <strong key={i} className="font-semibold text-[#1e293b]">
                      {line.text}
                    </strong>
                  ) : (
                    <span key={i}>{line.text}</span>
                  )
                )}
              </p>
              <p className="mt-1 text-[11px] text-[#94a3b8]">
                {formatActivityTime(item.occurredAt)}
              </p>
            </div>
          </li>
        );
      })}
    </>
  );
}
