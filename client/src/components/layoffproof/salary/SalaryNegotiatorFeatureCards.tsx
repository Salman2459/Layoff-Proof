import { BarChart3, FileText, MessageSquare, Target } from "lucide-react";

const features = [
  {
    icon: BarChart3,
    title: "Benchmark Ranges",
    description: "Realistic low, typical, and high salary ranges for your role and location.",
    cardBg: "bg-[#f5f3ff]",
    iconBg: "bg-[#ede9fe]",
    iconColor: "text-[#8b5cf6]",
  },
  {
    icon: MessageSquare,
    title: "Negotiation Scripts",
    description: "Copy-ready scripts for counter-offers, promotions, and out-of-cycle raises.",
    cardBg: "bg-[#faf5ff]",
    iconBg: "bg-[#f3e8ff]",
    iconColor: "text-[#a855f7]",
  },
  {
    icon: Target,
    title: "Talking Points",
    description: "Confidence-backed bullets anchored in your strengths and achievements.",
    cardBg: "bg-[#eff6ff]",
    iconBg: "bg-[#dbeafe]",
    iconColor: "text-[#6366f1]",
  },
  {
    icon: FileText,
    title: "Full Strategy",
    description: "Timeline, objection responses, and alternative benefits to negotiate.",
    cardBg: "bg-[#fdf4ff]",
    iconBg: "bg-[#fae8ff]",
    iconColor: "text-[#c026d3]",
  },
] as const;

export function SalaryNegotiatorFeatureCards() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {features.map((feature) => {
        const Icon = feature.icon;
        return (
          <div
            key={feature.title}
            className={`rounded-2xl border border-[#e8ecf4] p-4 ${feature.cardBg}`}
          >
            <div
              className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${feature.iconBg}`}
            >
              <Icon className={`h-5 w-5 ${feature.iconColor}`} strokeWidth={2} />
            </div>
            <p className="text-sm font-bold text-[#0f172a]">{feature.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-[#64748b]">{feature.description}</p>
          </div>
        );
      })}
    </div>
  );
}
