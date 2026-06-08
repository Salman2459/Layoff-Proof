import { cn } from "@/lib/utils";

const steps = [
  { num: 1, label: "Setup" },
  { num: 2, label: "Skills Selection" },
  { num: 3, label: "Assessment" },
  { num: 4, label: "Results" },
] as const;

type SkillsAssessmentStepperProps = {
  currentStep: number;
};

export function SkillsAssessmentStepper({ currentStep }: SkillsAssessmentStepperProps) {
  return (
    <div className="mb-8 flex items-center">
      {steps.map((step, index) => {
        const isActive = currentStep >= step.num;
        const isCurrent = currentStep === step.num;
        return (
          <div key={step.num} className="flex flex-1 items-center">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  isActive
                    ? "bg-[#7c3aed] text-white"
                    : "border border-[#e2e8f0] bg-white text-[#94a3b8]"
                )}
              >
                {step.num}
              </div>
              <span
                className={cn(
                  "whitespace-nowrap text-xs font-semibold sm:text-sm",
                  isCurrent ? "text-[#7c3aed]" : isActive ? "text-[#475569]" : "text-[#94a3b8]"
                )}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "mx-3 h-px flex-1 border-t border-dashed",
                  currentStep > step.num ? "border-[#c4b5fd]" : "border-[#e2e8f0]"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
