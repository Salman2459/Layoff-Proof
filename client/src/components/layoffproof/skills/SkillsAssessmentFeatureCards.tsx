import { BarChart3, Brain, GraduationCap, UserRound } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI-Powered Analysis",
    description:
      "Advanced AI evaluates your skills and provides accurate insights and recommendations.",
    cardBg: "bg-[#f5f3ff]",
    iconBg: "bg-[#ede9fe]",
    iconColor: "text-[#8b5cf6]",
  },
  {
    icon: BarChart3,
    title: "Identify Skill Gaps",
    description: "Discover your strengths and pinpoint areas that need improvement.",
    cardBg: "bg-[#eff6ff]",
    iconBg: "bg-[#dbeafe]",
    iconColor: "text-[#3b82f6]",
  },
  {
    icon: GraduationCap,
    title: "Personalized Learning",
    description: "Get a custom learning path with resources tailored to your goals.",
    cardBg: "bg-[#f0fdf4]",
    iconBg: "bg-[#dcfce7]",
    iconColor: "text-[#22c55e]",
  },
  {
    icon: UserRound,
    title: "Career Alignment",
    description: "Understand how your skills align with your target role and industry.",
    cardBg: "bg-[#fdf2f8]",
    iconBg: "bg-[#fce7f3]",
    iconColor: "text-[#ec4899]",
  },
] as const;

export function SkillsAssessmentFeatureCards() {
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
