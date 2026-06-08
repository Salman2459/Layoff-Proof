import {
  Award,
  Briefcase,
  Code2,
  FileText,
  Globe,
  GraduationCap,
  Home,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STEP_ICONS = [User, Home, Briefcase, GraduationCap, Code2, Globe, Award, FileText] as const;

type AutoJobApplyStepTabsProps = {
  steps: { label: string }[];
  currentStep: number;
  maxUnlockedStep: number;
  onStepClick: (index: number) => void;
  onLockedClick: () => void;
};

export function AutoJobApplyStepTabs({
  steps,
  currentStep,
  maxUnlockedStep,
  onStepClick,
  onLockedClick,
}: AutoJobApplyStepTabsProps) {
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {steps.map((step, idx) => {
        const locked = idx > maxUnlockedStep;
        const isActive = currentStep === idx;
        const Icon = STEP_ICONS[idx] ?? FileText;
        return (
          <button
            key={step.label}
            type="button"
            disabled={locked}
            onClick={() => {
              if (locked) {
                onLockedClick();
                return;
              }
              onStepClick(idx);
            }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition sm:text-sm",
              isActive
                ? "bg-[#7c3aed] text-white shadow-sm"
                : "border border-[#e8ecf4] bg-white text-[#64748b] hover:border-[#c4b5fd] hover:text-[#7c3aed]",
              locked && "cursor-not-allowed opacity-50 hover:border-[#e8ecf4] hover:text-[#64748b]"
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={isActive ? 2.25 : 1.75} />
            {idx + 1}. {step.label}
          </button>
        );
      })}
    </div>
  );
}
