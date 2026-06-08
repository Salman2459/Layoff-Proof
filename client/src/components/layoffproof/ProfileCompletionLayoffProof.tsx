import { Link } from "wouter";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProfileCompletionResult } from "@/lib/profileCompletion";

function getStrengthLabel(percent: number): { label: string; className: string } {
  if (percent < 40) return { label: "Needs work", className: "text-amber-600" };
  if (percent < 85) return { label: "Good", className: "text-emerald-600" };
  return { label: "Excellent", className: "text-emerald-600" };
}

function CircularRing({ percent }: { percent: number }) {
  const size = 128;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#e8ecf4"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#6366f1"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-[#0f172a]">{percent}%</span>
      </div>
    </div>
  );
}

type ProfileCompletionLayoffProofProps = {
  completion: ProfileCompletionResult;
  isLoading?: boolean;
  completeHref?: string;
};

export function ProfileCompletionLayoffProof({
  completion,
  isLoading = false,
  completeHref = "/auto-job-apply",
}: ProfileCompletionLayoffProofProps) {
  const { percent, missingFields, requiredMissing } = completion;
  const strength = getStrengthLabel(percent);
  const boostPills = missingFields.slice(0, 5);
  const hiddenCount = Math.max(0, missingFields.length - 5);
  const alertItems = requiredMissing.length > 0 ? requiredMissing : missingFields.slice(0, 2);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#e8ecf4] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="flex flex-col items-center sm:items-start">
            <CircularRing percent={isLoading ? 0 : percent} />
            <p className="mt-2 text-xs font-medium text-[#64748b]">Profile Strength</p>
            <p className={cn("text-sm font-semibold", strength.className)}>{strength.label}</p>
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-[#0f172a]">Profile Completion</h2>
            <p className="mt-1 text-sm text-[#64748b]">
              A complete profile helps you get better job matches and auto-apply results.
            </p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#e8ecf4]">
              <div
                className="h-full rounded-full bg-[#6366f1] transition-all duration-500"
                style={{ width: isLoading ? "0%" : `${percent}%` }}
              />
            </div>
            {boostPills.length > 0 && !isLoading ? (
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium text-[#64748b]">
                  Complete these to boost your score:
                </p>
                <div className="flex flex-wrap gap-2">
                  {boostPills.map((field) => (
                    <span
                      key={field}
                      className="rounded-full border border-[#e2e8f0] bg-[#f8fafc] px-3 py-1 text-xs font-medium text-[#475569]"
                    >
                      {field}
                    </span>
                  ))}
                  {hiddenCount > 0 ? (
                    <span className="rounded-full border border-dashed border-[#cbd5e1] bg-white px-3 py-1 text-xs font-medium text-[#94a3b8]">
                      +{hiddenCount} more
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {alertItems.length > 0 && !isLoading && percent < 100 ? (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" strokeWidth={2} />
            <div>
              <p className="text-sm font-semibold text-amber-900">Information missing</p>
              <p className="mt-0.5 text-xs text-amber-800/90">
                {alertItems.join(", ")}
              </p>
            </div>
          </div>
          <Link
            href={completeHref}
            className="shrink-0 text-sm font-semibold text-[#6366f1] no-underline hover:text-[#4f46e5]"
          >
            Complete Profile →
          </Link>
        </div>
      ) : null}
    </div>
  );
}
