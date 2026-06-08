import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type ResumeBuilderProgressStepperProps = {
  steps: string[];
  currentStepIndex: number;
  className?: string;
};

export function ResumeBuilderProgressStepper({
  steps,
  currentStepIndex,
  className,
}: ResumeBuilderProgressStepperProps) {
  return (
    <div className={cn("mx-auto mb-10 w-full max-w-3xl", className)}>
      <div className="flex w-full items-start">
        {steps.map((step, index) => (
          <div key={step} className="flex flex-1 items-center">
            <div className="flex w-[88px] shrink-0 flex-col items-center sm:w-[108px]">
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-bold transition-colors",
                  index < currentStepIndex
                    ? "bg-[#6366f1] text-white shadow-sm shadow-indigo-200/80"
                    : index === currentStepIndex
                      ? "bg-[#6366f1] text-white shadow-sm shadow-indigo-200/80"
                      : "bg-[#e8ecf4] text-[#94a3b8]"
                )}
              >
                {index < currentStepIndex ? (
                  <Check className="h-4 w-4" strokeWidth={2.5} />
                ) : (
                  index + 1
                )}
              </div>
              <p
                className={cn(
                  "mt-2 w-full px-0.5 text-center text-[11px] font-semibold leading-tight",
                  index <= currentStepIndex ? "text-[#6366f1]" : "text-[#94a3b8]"
                )}
              >
                {step}
              </p>
            </div>
            {index < steps.length - 1 ? (
              <div
                className={cn(
                  "mx-1 mb-6 h-[2px] min-w-[20px] flex-1 rounded-full",
                  index < currentStepIndex ? "bg-[#6366f1]" : "bg-[#e8ecf4]"
                )}
                aria-hidden
              />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
