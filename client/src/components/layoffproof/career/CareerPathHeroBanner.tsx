import { BarChart3, Database, Sparkles, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { CareerPathHeroIllustration } from "./CareerPathHeroIllustration";

const pills = [
  { label: "AI Powered", icon: Sparkles },
  { label: "Personalized", icon: Target },
  { label: "Data Driven", icon: Database },
] as const;

export function CareerPathHeroBanner() {
  return (
    <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-r from-[#6d28d9] via-[#9333ea] to-[#ec4899] px-6 py-7 shadow-sm sm:px-8 sm:py-8">
      <div className="flex items-center justify-between gap-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
              <BarChart3 className="h-5 w-5 text-[#7c3aed]" strokeWidth={2.25} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-[26px]">
              Career Path Analyzer
            </h1>
          </div>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/95 sm:text-[15px]">
            Discover your ideal career trajectory with AI-powered analysis and personalized
            recommendations.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {pills.map((pill) => {
              const Icon = pill.icon;
              return (
                <span
                  key={pill.label}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-sm"
                  )}
                >
                  <Icon className="h-3 w-3" strokeWidth={2} />
                  {pill.label}
                </span>
              );
            })}
          </div>
        </div>
        <CareerPathHeroIllustration />
      </div>
    </div>
  );
}
