import { BarChart3, MessageSquare, Sparkles, TrendingUp } from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "Personalized Questions",
    description: "Questions tailored to the job description and role",
    iconBg: "bg-[#ede9fe]",
    iconColor: "text-[#8b5cf6]",
  },
  {
    icon: BarChart3,
    title: "AI Scoring",
    description: "Get intelligent scores based on industry best practices",
    iconBg: "bg-[#fce7f3]",
    iconColor: "text-[#ec4899]",
  },
  {
    icon: MessageSquare,
    title: "Detailed Feedback",
    description: "Receive actionable feedback to improve your answers",
    iconBg: "bg-[#dbeafe]",
    iconColor: "text-[#3b82f6]",
  },
  {
    icon: TrendingUp,
    title: "Practice & Improve",
    description: "Practice, enhance, and boost your interview performance",
    iconBg: "bg-[#dcfce7]",
    iconColor: "text-[#22c55e]",
  },
] as const;

export function InterviewPrepFeatureCards() {
  return (
    <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {features.map((feature) => {
        const Icon = feature.icon;
        return (
          <div
            key={feature.title}
            className="flex items-start gap-3 rounded-2xl border border-[#e8ecf4] bg-white p-4 shadow-sm"
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${feature.iconBg}`}
            >
              <Icon className={`h-5 w-5 ${feature.iconColor}`} strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#0f172a]">{feature.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-[#64748b]">{feature.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
