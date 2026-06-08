import { BarChart3, FileText, Headphones, Wand2 } from "lucide-react";

const features = [
  {
    icon: Wand2,
    title: "Unlimited Auto Apply",
    description: "Apply to hundreds of jobs on autopilot.",
  },
  {
    icon: FileText,
    title: "AI-Powered Tools",
    description: "Access advanced AI tools to stand out.",
  },
  {
    icon: BarChart3,
    title: "Smart Insights",
    description: "Get insights to improve your chances.",
  },
  {
    icon: Headphones,
    title: "Priority Support",
    description: "Get faster support when you need it.",
  },
] as const;

export function WhyUpgradeSection() {
  return (
    <div className="mt-6 rounded-2xl border border-[#ede9fe] bg-[#faf5ff]/90 px-5 py-5 sm:px-6 sm:py-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-8">
        <h3 className="shrink-0 text-base font-bold text-[#0f172a]">Why Upgrade?</h3>
        <div className="grid flex-1 grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#ddd6fe] bg-white shadow-sm">
                <Icon className="h-4 w-4 text-[#8b5cf6]" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#0f172a]">{title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-[#64748b]">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
