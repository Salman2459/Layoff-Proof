import { Link } from "wouter";
import { CheckCircle2, Info } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  getProfileCompletionColors,
  getProfileCompletionLabel,
  type ProfileCompletionResult,
} from "@/lib/profileCompletion";

type ProfileCompletionCardProps = {
  completion: ProfileCompletionResult;
  isLoading?: boolean;
  /** Max missing-field pills before "+N more" */
  maxPills?: number;
  editHref?: string;
  editLabel?: string;
  className?: string;
  compact?: boolean;
};

export function ProfileCompletionCard({
  completion,
  isLoading = false,
  maxPills = 5,
  editHref,
  editLabel = "Complete profile",
  className,
  compact = false,
}: ProfileCompletionCardProps) {
  const { percent, missingFields, requiredMissing } = completion;
  const colors = getProfileCompletionColors(percent);
  const label = getProfileCompletionLabel(percent);
  const visiblePills = missingFields.slice(0, maxPills);
  const hiddenCount = Math.max(0, missingFields.length - maxPills);

  return (
    <div className={cn("space-y-4", className)}>
      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-orange-200/80 bg-gradient-to-br from-orange-50/90 to-amber-50/50 shadow-sm",
          "dark:border-orange-500/25 dark:from-orange-950/40 dark:to-amber-950/20"
        )}
      >
        <div className={cn("p-5 sm:p-6", compact && "p-4")}>
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-300">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  Profile Completion
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
              </div>
            </div>
            <span
              className={cn(
                "text-2xl font-extrabold tabular-nums",
                colors.text,
                compact && "text-xl"
              )}
            >
              {isLoading ? "…" : `${percent}%`}
            </span>
          </div>

          <Progress
            value={isLoading ? 0 : percent}
            className="h-3 rounded-full bg-orange-100 dark:bg-orange-950/50 [&>div]:bg-orange-500"
          />

          {missingFields.length > 0 && !isLoading && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Complete these to boost your score:
              </p>
              <div className="flex flex-wrap gap-2">
                {visiblePills.map((field) => (
                  <span
                    key={field}
                    className="inline-flex rounded-full border border-gray-200 bg-white/90 px-3 py-1 text-xs font-medium text-gray-700 shadow-sm dark:border-gray-600 dark:bg-gray-900/60 dark:text-gray-200"
                  >
                    {field}
                  </span>
                ))}
                {hiddenCount > 0 && (
                  <span className="inline-flex rounded-full border border-dashed border-gray-300 bg-white/60 px-3 py-1 text-xs font-medium text-gray-500 dark:border-gray-600 dark:bg-gray-900/40">
                    +{hiddenCount} more
                  </span>
                )}
              </div>
            </div>
          )}

          {percent === 100 && !isLoading && (
            <p className="mt-3 text-sm font-medium text-green-700 dark:text-green-400">
              All profile fields are complete.
            </p>
          )}
        </div>
      </div>

      {requiredMissing.length > 0 && !isLoading && (
        <div
          className="rounded-xl border border-red-200 bg-red-50/80 p-4 dark:border-red-500/30 dark:bg-red-950/30"
          role="alert"
        >
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-800 dark:text-red-300">
            <Info className="h-4 w-4 shrink-0" />
            Required information missing
          </div>
          <p className="mb-2 text-sm text-red-700/90 dark:text-red-200/90">
            Add the following to use auto-apply and scoring features:
          </p>
          <ul className="list-inside list-disc space-y-1 text-sm text-red-800 dark:text-red-200">
            {requiredMissing.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {editHref && percent < 100 && !isLoading && (
        <div className="flex justify-end">
          <Link
            href={editHref}
            className="text-sm font-semibold text-primary hover:underline"
          >
            {editLabel} →
          </Link>
        </div>
      )}
    </div>
  );
}
