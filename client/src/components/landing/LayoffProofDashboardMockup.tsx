import {
  LayoutDashboard,
  Bot,
  FileText,
  Linkedin,
  Mail,
  Briefcase,
  Sparkles,
  Users,
  BarChart3,
  Award,
  MessageCircle,
  Bookmark,
  FolderOpen,
  Settings,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
import { LayoffProofLogo } from "@/components/LayoffProofLogo";
import { HERO_TOOLS } from "./layoffproof-landing-data";

const SIDEBAR_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: Bot, label: "AI Auto Apply" },
  { icon: FileText, label: "Resume Builder" },
  { icon: Linkedin, label: "LinkedIn Optimize" },
  { icon: Mail, label: "AI Cover Letter" },
  { icon: Briefcase, label: "Job Tracker" },
  { icon: Sparkles, label: "Job Matches" },
  { icon: Users, label: "Interview Prep" },
  { icon: BarChart3, label: "Resume Analyzer" },
  { icon: Award, label: "Skills Boost" },
  { icon: MessageCircle, label: "Career Assistant" },
  { icon: Bookmark, label: "Saved Jobs" },
  { icon: FolderOpen, label: "Documents" },
  { icon: Settings, label: "Settings" },
];

export function LayoffProofDashboardMockup() {
  return (
    <div
      className="relative w-full max-w-[560px] rounded-2xl border border-[#e8ecf4] bg-white p-1 shadow-[0_24px_64px_-12px_rgba(93,95,239,0.25),0_12px_32px_-8px_rgba(15,23,42,0.08)]"
      aria-hidden
    >
      <div className="flex overflow-hidden rounded-[14px] bg-[#f4f6fb]">
        <aside className="hidden w-[148px] shrink-0 border-r border-[#e8ecf4] bg-white py-3 sm:block">
          <div className="mb-3 px-3">
            <LayoffProofLogo
              iconClassName="h-7 w-7 rounded-md text-[10px]"
              textClassName="text-[10px] font-bold leading-tight"
            />
          </div>
          <ul className="space-y-0.5 px-2">
            {SIDEBAR_ITEMS.slice(0, 8).map((item) => {
              const Icon = item.icon;
              return (
                <li
                  key={item.label}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[10px] font-medium ${
                    item.active
                      ? "bg-[#eef2ff] text-[#5D5FEF]"
                      : "text-[#64748b]"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                  <span className="truncate">{item.label}</span>
                </li>
              );
            })}
          </ul>
        </aside>

        <div className="min-w-0 flex-1 p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-[13px] font-bold text-[#0f172a]">Hi, John! 👋</p>
              <p className="text-[10px] text-[#64748b]">Let&apos;s land your dream role</p>
            </div>
            <button
              type="button"
              className="hidden rounded-lg bg-[#5D5FEF] px-2.5 py-1 text-[10px] font-semibold text-white sm:inline"
            >
              View Analytics
            </button>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#818cf8] to-[#6366f1] text-[10px] font-bold text-white">
              J
            </div>
          </div>

          <div className="mb-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-[#e8ecf4] bg-white p-2.5 shadow-sm">
              <p className="text-[9px] font-medium text-[#64748b]">Profile Strength</p>
              <div className="mt-1 flex items-center gap-2">
                <div className="relative h-10 w-10">
                  <svg className="h-10 w-10 -rotate-90" viewBox="0 0 36 36">
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth="3"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth="3"
                      strokeDasharray="77 100"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-[#0f172a]">
                      85%
                    </span>
                </div>
                <span className="text-[10px] font-semibold text-emerald-600">Excellent</span>
              </div>
            </div>
            <div className="rounded-xl border border-[#e8ecf4] bg-white p-2.5 shadow-sm">
              <p className="text-[9px] font-medium text-[#64748b]">Next Step</p>
              <p className="mt-0.5 text-[10px] font-semibold text-[#1e293b]">Update resume</p>
              <span className="mt-1 inline-block text-[9px] font-semibold text-[#5D5FEF]">
                Update Now →
              </span>
            </div>
          </div>

          <div className="mb-3 rounded-xl border border-[#e8ecf4] bg-white p-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-medium text-[#64748b]">Applications This Month</p>
              <TrendingUp className="h-3 w-3 text-[#5D5FEF]" />
            </div>
            <p className="mt-0.5 text-xl font-bold text-[#0f172a]">32</p>
            <div className="mt-2 flex h-8 items-end gap-0.5">
              {[4, 7, 5, 9, 6, 11, 8, 12, 10, 14].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t bg-[#5D5FEF]/80"
                  style={{ height: `${h * 2}px` }}
                />
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[#e8ecf4] bg-white p-2.5 shadow-sm">
            <p className="mb-2 text-[9px] font-semibold text-[#0f172a]">Your Tools</p>
            <div className="grid grid-cols-3 gap-1.5">
              {HERO_TOOLS.map((tool) => {
                const Icon = tool.icon;
                return (
                  <div
                    key={tool.label}
                    className="flex flex-col items-center rounded-lg border border-[#f1f5f9] bg-[#fafbfc] p-1.5"
                  >
                    <div
                      className={`mb-1 flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br ${tool.bg} text-white`}
                    >
                      <Icon className="h-3 w-3" strokeWidth={2} />
                    </div>
                    <span className="text-center text-[7px] font-medium leading-tight text-[#64748b]">
                      {tool.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md">
        <ChevronRight className="h-4 w-4 text-[#5D5FEF]" />
      </div>
    </div>
  );
}
