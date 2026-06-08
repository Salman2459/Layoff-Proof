import { Target } from "lucide-react";
import { SkillsAssessmentHeroIllustration } from "./SkillsAssessmentHeroIllustration";

export function SkillsAssessmentHeroBanner() {
  return (
    <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-r from-[#6d28d9] via-[#9333ea] to-[#ec4899] px-6 py-7 shadow-sm sm:px-8 sm:py-8">
      <div className="flex items-center justify-between gap-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
              <Target className="h-5 w-5 text-[#7c3aed]" strokeWidth={2.25} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-[26px]">
              Skills Assessment
            </h1>
          </div>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/95 sm:text-[15px]">
            Evaluate and improve your professional skills with comprehensive assessments and
            personalized learning paths.
          </p>
        </div>
        <SkillsAssessmentHeroIllustration />
      </div>
    </div>
  );
}
