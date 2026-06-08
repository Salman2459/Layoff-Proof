import { Star, Target, TrendingUp, LineChart } from "lucide-react";

const features = [
  {
    icon: LineChart,
    title: "AI Career Insights",
    description: "Get intelligent analysis of your career trajectory and market opportunities.",
    cardBg: "bg-[#f5f3ff]",
    iconBg: "bg-[#ede9fe]",
    iconColor: "text-[#8b5cf6]",
  },
  {
    icon: Target,
    title: "Personalized Paths",
    description: "Receive career path recommendations tailored to your unique profile.",
    cardBg: "bg-[#eff6ff]",
    iconBg: "bg-[#dbeafe]",
    iconColor: "text-[#3b82f6]",
  },
  {
    icon: TrendingUp,
    title: "Growth Opportunities",
    description: "Identify high-potential roles and skills that accelerate your career growth.",
    cardBg: "bg-[#f0fdf4]",
    iconBg: "bg-[#dcfce7]",
    iconColor: "text-[#22c55e]",
  },
  {
    icon: Star,
    title: "Actionable Roadmap",
    description: "Get clear next steps and milestones to reach your career goals.",
    cardBg: "bg-[#fdf2f8]",
    iconBg: "bg-[#fce7f3]",
    iconColor: "text-[#ec4899]",
  },
] as const;

export function CareerPathFeatureCards() {
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
