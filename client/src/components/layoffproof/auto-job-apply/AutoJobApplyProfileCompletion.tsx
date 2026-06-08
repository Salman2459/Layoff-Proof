import { AlertCircle, Check, ClipboardList } from "lucide-react";
import {
  getProfileCompletionLabel,
  type JobProfileLike,
  type ProfileCompletionResult,
} from "@/lib/profileCompletion";
import { cn } from "@/lib/utils";

const BOOST_IDS = [
  "location",
  "currentJobTitle",
  "currentCompany",
  "workExperience",
  "education",
  "skills",
  "languages",
  "resume",
  "yearsExperience",
  "linkedin",
] as const;

type AutoJobApplyProfileCompletionProps = {
  completion: ProfileCompletionResult;
  profile: JobProfileLike;
  isLoading?: boolean;
};

export function AutoJobApplyProfileCompletion({
  completion,
  profile,
  isLoading = false,
}: AutoJobApplyProfileCompletionProps) {
  const { percent, missingFields, requiredMissing } = completion;
  const subtitle = getProfileCompletionLabel(percent);

  const boostPills = BOOST_IDS.map((id) => {
    const labels: Record<string, string> = {
      location: "Location",
      currentJobTitle: "Current job title",
      currentCompany: "Current company",
      workExperience: "Work experience",
      education: "Education",
      skills: "Skills (at least 3)",
      languages: "Language",
      resume: "Resume",
      yearsExperience: "Years of experience",
      linkedin: "LinkedIn URL",
    };
    const complete =
      id === "location"
        ? !!profile.city?.trim() && !!profile.country?.trim()
        : id === "currentJobTitle"
          ? !!profile.jobTitle?.trim() || !!profile.experiences?.[0]?.title?.trim()
          : id === "currentCompany"
            ? !!profile.experiences?.[0]?.company?.trim()
            : id === "workExperience"
              ? (profile.experiences?.length ?? 0) > 0
              : id === "education"
                ? (profile.education?.length ?? 0) > 0
                : id === "skills"
                  ? (profile.skills?.length ?? 0) >= 3
                  : id === "languages"
                    ? (profile.languages?.length ?? 0) > 0
                    : id === "resume"
                      ? !!(profile.resume?.trim() || profile.resumeUrl?.trim())
                      : id === "yearsExperience"
                        ? !!profile.totalExperience?.trim()
                        : !!profile.linkedin?.trim();
    return { label: labels[id], complete };
  });

  const visiblePills = boostPills.slice(0, 4);
  const hiddenCount = Math.max(0, missingFields.length - visiblePills.filter((p) => !p.complete).length);

  return (
    <div className="mb-6 space-y-4">
      <div className="rounded-2xl border border-[#e8ecf4] bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ede9fe]">
              <ClipboardList className="h-5 w-5 text-[#8b5cf6]" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0f172a]">Profile Completion</h2>
              <p className="mt-0.5 text-sm text-[#64748b]">{subtitle}</p>
            </div>
          </div>
          <span className="text-2xl font-bold tabular-nums text-[#7c3aed]">
            {isLoading ? "…" : `${percent}%`}
          </span>
        </div>

        <div className="h-2.5 overflow-hidden rounded-full bg-[#ede9fe]">
          <div
            className="h-full rounded-full bg-[#7c3aed] transition-all duration-500"
            style={{ width: isLoading ? "0%" : `${percent}%` }}
          />
        </div>

        {!isLoading && percent < 100 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-medium text-[#64748b]">
              Complete these to boost your score:
            </p>
            <div className="flex flex-wrap gap-2">
              {visiblePills.map((pill) => (
                <span
                  key={pill.label}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
                    pill.complete
                      ? "border-[#bbf7d0] bg-[#f0fdf4] text-[#166534]"
                      : "border-[#e2e8f0] bg-[#f8fafc] text-[#475569]"
                  )}
                >
                  {pill.complete ? (
                    <Check className="h-3 w-3 text-[#22c55e]" strokeWidth={3} />
                  ) : null}
                  {pill.label}
                </span>
              ))}
              {hiddenCount > 0 ? (
                <span className="rounded-full border border-dashed border-[#c4b5fd] bg-[#faf5ff] px-3 py-1 text-xs font-semibold text-[#7c3aed]">
                  + {hiddenCount} more
                </span>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {requiredMissing.length > 0 && !isLoading && (
        <div className="flex flex-col gap-4 overflow-hidden rounded-2xl border border-[#fecaca] bg-[#fef2f2] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fee2e2]">
              <AlertCircle className="h-5 w-5 text-[#ef4444]" strokeWidth={2} />
            </div>
            <div>
              <p className="text-sm font-bold text-[#b91c1c]">Required information missing</p>
              <p className="mt-0.5 text-xs text-[#dc2626]">
                Add the following to use auto-apply and scoring features:
              </p>
              <ul className="mt-2 list-inside list-disc space-y-0.5 text-xs text-[#dc2626]">
                {requiredMissing.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="hidden shrink-0 sm:block" aria-hidden>
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-[#fce7f3]">
              <ClipboardList className="h-8 w-8 text-[#f9a8d4]" strokeWidth={1.5} />
              <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#ef4444] text-white">
                <span className="text-xs font-bold">!</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
