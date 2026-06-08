import { ClipboardList, Megaphone, UserRound } from "lucide-react";

const practices = [
  {
    icon: ClipboardList,
    title: "Research First",
    description:
      "Always research the recipient and company before reaching out. Mention specific details to show genuine interest.",
    iconBg: "bg-[#ede9fe]",
    iconColor: "text-[#8b5cf6]",
  },
  {
    icon: Megaphone,
    title: "Be Concise",
    description:
      "Keep messages short and focused. Recruiters are busy — make your value proposition clear quickly.",
    iconBg: "bg-[#fce7f3]",
    iconColor: "text-[#ec4899]",
  },
  {
    icon: UserRound,
    title: "Follow Up",
    description:
      "If you don't hear back in a week, send a polite follow-up. Persistence shows genuine interest.",
    iconBg: "bg-[#dcfce7]",
    iconColor: "text-[#22c55e]",
  },
] as const;

export function OutreachBestPractices() {
  return (
    <div className="mt-8">
      <h2 className="mb-4 text-base font-bold text-[#0f172a]">Outreach Best Practices</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {practices.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="rounded-2xl border border-[#e8ecf4] bg-white p-5 shadow-sm"
            >
              <div
                className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${item.iconBg}`}
              >
                <Icon className={`h-5 w-5 ${item.iconColor}`} strokeWidth={2} />
              </div>
              <p className="text-sm font-bold text-[#0f172a]">{item.title}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-[#64748b]">{item.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
