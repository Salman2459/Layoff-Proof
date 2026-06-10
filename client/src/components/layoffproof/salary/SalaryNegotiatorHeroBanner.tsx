import { DollarSign } from "lucide-react";
import { SalaryNegotiatorHeroIllustration } from "./SalaryNegotiatorHeroIllustration";

export function SalaryNegotiatorHeroBanner() {
  return (
    <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-r from-[#6d28d9] via-[#9333ea] to-[#ec4899] px-6 py-7 shadow-sm sm:px-8 sm:py-8">
      <div className="flex items-center justify-between gap-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
              <DollarSign className="h-5 w-5 text-[#7c3aed]" strokeWidth={2.25} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-[26px]">
              Salary Negotiator
            </h1>
          </div>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/95 sm:text-[15px]">
            Get data-driven insights, benchmark ranges, and proven scripts for successful salary
            negotiations.
          </p>
        </div>
        <SalaryNegotiatorHeroIllustration />
      </div>
    </div>
  );
}
