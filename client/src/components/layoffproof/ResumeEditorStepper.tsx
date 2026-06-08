import { cn } from "@/lib/utils";
import {
  RESUME_EDITOR_SECTIONS,
  type ResumeEditorSection,
} from "./resume-builder-ui";

type ResumeEditorStepperProps = {
  activeSection: ResumeEditorSection;
  onSectionChange: (section: ResumeEditorSection) => void;
};

export function ResumeEditorStepper({
  activeSection,
  onSectionChange,
}: ResumeEditorStepperProps) {
  const activeIndex = RESUME_EDITOR_SECTIONS.findIndex((s) => s.id === activeSection);

  return (
    <div className="overflow-x-auto border-b border-[#e8ecf4] bg-white px-6 py-5 sm:px-8">
      <div className="flex min-w-[720px] items-start">
        {RESUME_EDITOR_SECTIONS.map((step, index) => {
          const Icon = step.icon;
          const isActive = step.id === activeSection;
          const isComplete = index < activeIndex;
          return (
            <div key={step.id} className="flex flex-1 items-start">
              <button
                type="button"
                onClick={() => onSectionChange(step.id)}
                className="group flex w-full min-w-0 flex-col items-center gap-2 px-1 text-center"
              >
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    isActive
                      ? "border-[#6366f1] bg-[#6366f1] text-white shadow-md shadow-indigo-200/60"
                      : isComplete
                        ? "border-[#6366f1] bg-[#eef2ff] text-[#6366f1]"
                        : "border-[#e2e8f0] bg-white text-[#94a3b8] group-hover:border-[#c7d2fe]"
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.25 : 1.75} />
                </div>
                <div className="w-full min-w-0">
                  <p
                    className={cn(
                      "truncate text-xs font-semibold",
                      isActive ? "text-[#4f46e5]" : "text-[#334155]"
                    )}
                  >
                    {step.label}
                  </p>
                  <p className="mt-0.5 hidden truncate text-[10px] text-[#94a3b8] sm:block">
                    {step.description}
                  </p>
                </div>
              </button>
              {index < RESUME_EDITOR_SECTIONS.length - 1 ? (
                <div
                  className={cn(
                    "mx-1 mt-5 h-0.5 w-full min-w-[12px] max-w-[48px] flex-1 rounded-full sm:max-w-none",
                    index < activeIndex ? "bg-[#6366f1]" : "bg-[#e2e8f0]"
                  )}
                  aria-hidden
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
