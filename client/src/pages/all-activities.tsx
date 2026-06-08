import { Link } from "wouter";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { LayoffProofLayout } from "@/components/layoffproof/LayoffProofLayout";
import { RecentActivityList } from "@/components/layoffproof/RecentActivityList";
import { useAuth } from "@/hooks/useAuth";
import {
  type RecentActivitiesResponse,
} from "@/lib/recentActivities";

const ALL_ACTIVITIES_LIMIT = 100;

export default function AllActivitiesPage() {
  const { isAuthenticated } = useAuth();
  const { data, isLoading } = useQuery<RecentActivitiesResponse>({
    queryKey: [`/api/user/recent-activities?limit=${ALL_ACTIVITIES_LIMIT}`],
    enabled: isAuthenticated,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const activities = data?.activities ?? [];

  return (
    <LayoffProofLayout activeNavId="dashboard">
      <header className="sticky top-0 z-20 border-b border-[#e8ecf4] bg-[#f4f6fb]/95 px-8 py-5 backdrop-blur-sm">
        <Link
          href="/dashboard"
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-[#64748b] no-underline transition hover:text-[#6366f1]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        <h1 className="text-xl font-bold tracking-tight text-[#0f172a]">All Activity</h1>
        <p className="mt-0.5 text-[13px] text-[#64748b]">
          Your full history across Layoff Proof tools and profile updates.
        </p>
      </header>

      <main className="flex-1 px-8 py-6">
        <div className="mx-auto max-w-2xl rounded-2xl border border-[#e8ecf4] bg-white p-6 shadow-sm">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-[#94a3b8]">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading activity…
            </div>
          ) : (
            <>
              <p className="mb-4 text-xs font-medium text-[#64748b]">
                {activities.length} {activities.length === 1 ? "activity" : "activities"}
              </p>
              <ul className="space-y-4">
                <RecentActivityList activities={activities} />
              </ul>
            </>
          )}
        </div>
      </main>
    </LayoffProofLayout>
  );
}
