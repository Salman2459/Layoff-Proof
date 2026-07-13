import {
  AlertCircle,
  Award,
  Book,
  BookOpen,
  Briefcase,
  Check,
  CheckCircle2,
  Download,
  RefreshCw,
  FileText,
  Folder,
  Globe,
  GraduationCap,
  Heart,
  Image,
  Info,
  Lightbulb,
  Link2,
  Linkedin,
  Mail,
  MapPin,
  MessageSquare,
  Pencil,
  Sparkles,
  Star,
  Target,
  Trophy,
  Type,
  User,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ChecklistItem,
  LinkedInProfileView,
  LinkedInSuggestion,
  OptimizerStats,
  SuggestionImpact,
} from "@/lib/linkedinOptimizer";
import { strengthLabel } from "@/lib/linkedinOptimizer";

const IMPACT_STYLES: Record<
  SuggestionImpact,
  { pill: string; iconBg: string; iconColor: string }
> = {
  high: { pill: "bg-red-50 text-red-600", iconBg: "bg-violet-100", iconColor: "text-violet-600" },
  improve: { pill: "bg-amber-50 text-amber-700", iconBg: "bg-blue-100", iconColor: "text-blue-600" },
  good: { pill: "bg-sky-50 text-sky-700", iconBg: "bg-orange-100", iconColor: "text-orange-600" },
  completed: { pill: "bg-emerald-50 text-emerald-700", iconBg: "bg-emerald-100", iconColor: "text-emerald-600" },
};

const IMPACT_LABEL: Record<SuggestionImpact, string> = {
  high: "High Impact",
  improve: "To Improve",
  good: "Good to Have",
  completed: "Completed",
};

function ChecklistIcon({ icon }: { icon: string }) {
  const cls = "h-4 w-4 text-[#64748b]";
  const map: Record<string, React.ReactNode> = {
    user: <User className={cls} />,
    type: <Type className={cls} />,
    file: <FileText className={cls} />,
    briefcase: <Briefcase className={cls} />,
    graduation: <GraduationCap className={cls} />,
    sparkles: <Sparkles className={cls} />,
    award: <Award className={cls} />,
    globe: <Globe className={cls} />,
    map: <MapPin className={cls} />,
    mail: <Mail className={cls} />,
    star: <Star className={cls} />,
    message: <MessageSquare className={cls} />,
    heart: <Heart className={cls} />,
    folder: <Folder className={cls} />,
    book: <Book className={cls} />,
    "book-open": <BookOpen className={cls} />,
    trophy: <Trophy className={cls} />,
    lightbulb: <Lightbulb className={cls} />,
    link: <Link2 className={cls} />,
    image: <Image className={cls} />,
  };
  return <>{map[icon] ?? <Info className={cls} />}</>;
}

function StrengthRing({ score }: { score: number }) {
  const size = 112;
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color = score >= 80 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e8ecf4" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-[#0f172a]">{score}</span>
        <span className="text-[10px] font-medium text-[#94a3b8]">/ 100</span>
      </div>
    </div>
  );
}

type ProfileStrengthCardProps = {
  stats: OptimizerStats;
  summary?: string;
};

export function ProfileStrengthCard({ stats, summary }: ProfileStrengthCardProps) {
  const label = strengthLabel(stats.score);
  const labelColor =
    stats.score >= 85 ? "text-emerald-600" : stats.score >= 70 ? "text-emerald-600" : "text-amber-600";

  return (
    <div className="rounded-2xl border border-[#e8ecf4] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
        <div className="flex flex-col items-center gap-1 sm:flex-row sm:items-center sm:gap-5">
          <StrengthRing score={stats.score} />
          <div className="text-center sm:text-left">
            <p className="text-xs font-medium text-[#64748b]">Profile Strength</p>
            <p className={cn("text-sm font-semibold", labelColor)}>{label}</p>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-[#0f172a]">
            {stats.score >= 70 ? "Great job! Your profile is strong." : "Room to grow — let's optimize."}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-[#64748b]">
            {summary ||
              "Complete high-impact sections first to attract recruiters for your target role."}
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e8ecf4]">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${stats.score}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Completed", value: stats.completed, icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50" },
          { label: "To Improve", value: stats.toImprove, icon: AlertCircle, color: "text-amber-600 bg-amber-50" },
          { label: "Missing", value: stats.missing, icon: XCircle, color: "text-red-600 bg-red-50" },
          { label: "Good to Have", value: stats.goodToHave, icon: Info, color: "text-blue-600 bg-blue-50" },
        ].map((s) => (
          <div
            key={s.label}
            className="flex items-center gap-2 rounded-xl border border-[#e8ecf4] bg-[#f8fafc] px-3 py-2.5"
          >
            <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", s.color)}>
              <s.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold leading-none text-[#0f172a]">{s.value}</p>
              <p className="truncate text-[11px] text-[#64748b]">{s.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LinkedInProfilePreviewCard({ profile }: { profile: LinkedInProfileView }) {
  const exp = profile.company || "Company";
  const edu = profile.school || "University";

  return (
    <div className="overflow-hidden rounded-2xl border border-[#e8ecf4] bg-white shadow-sm">
      <div
        className="relative h-24 bg-gradient-to-r from-slate-600 via-slate-500 to-slate-400 sm:h-28"
        style={{
          backgroundImage:
            "linear-gradient(135deg, #475569 0%, #64748b 40%, #94a3b8 100%)",
        }}
      />
      <div className="relative px-4 pb-4 sm:px-5">
        <div className="-mt-10 mb-3 flex items-end justify-between gap-3">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-gradient-to-br from-[#818cf8] to-[#6366f1] text-2xl font-bold text-white shadow-md sm:h-[88px] sm:w-[88px]">
            {profile.profileImageUrl ? (
              <img src={profile.profileImageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              profile.name.charAt(0) || "?"
            )}
          </div>
          <div className="flex gap-2 pb-1">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e2e8f0] bg-white text-[#0a66c2]">
              <Linkedin className="h-4 w-4" />
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e2e8f0] bg-white text-[#64748b]">
              <Pencil className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-start gap-2">
          <h3 className="text-lg font-bold text-[#0f172a]">{profile.name}</h3>
          <CheckCircle2 className="h-5 w-5 shrink-0 text-[#0a66c2]" />
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-[#334155]">{profile.headline}</p>
        <p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-[#64748b]">
          <MapPin className="h-3.5 w-3.5" />
          {profile.location || "Add location"}
          <span className="text-[#cbd5e1]">·</span>
          <button type="button" className="font-semibold text-[#0a66c2]">
            Contact info
          </button>
        </p>
        {profile.connections && (
          <p className="mt-0.5 text-xs font-medium text-[#0a66c2]">{profile.connections}</p>
        )}

        <div className="mt-4 flex flex-wrap gap-4 border-t border-[#e8ecf4] pt-3">
          <div className="flex items-center gap-2 text-xs text-[#475569]">
            <span className="flex h-8 w-8 items-center justify-center rounded bg-[#f1f5f9] text-[10px] font-bold">
              {exp.slice(0, 2).toUpperCase()}
            </span>
            {exp}
          </div>
          <div className="flex items-center gap-2 text-xs text-[#475569]">
            <span className="flex h-8 w-8 items-center justify-center rounded bg-[#fef3c7] text-[10px] font-bold text-[#b45309]">
              {edu.slice(0, 1)}
            </span>
            {edu}
          </div>
        </div>
      </div>
    </div>
  );
}

type SuggestionTab = "all" | "high" | "improve" | "good" | "completed";

type OptimizationSuggestionsProps = {
  suggestions: LinkedInSuggestion[];
  tabCounts: Record<SuggestionTab, number>;
  activeTab: SuggestionTab;
  onTabChange: (tab: SuggestionTab) => void;
  onImprove: (suggestion: LinkedInSuggestion) => void;
  showAll: boolean;
  onToggleShowAll: () => void;
  emptyMessage?: string;
};

export function OptimizationSuggestionsPanel({
  suggestions,
  tabCounts,
  activeTab,
  onTabChange,
  onImprove,
  showAll,
  onToggleShowAll,
  emptyMessage,
}: OptimizationSuggestionsProps) {
  const tabs: { id: SuggestionTab; label: string }[] = [
    { id: "all", label: "All" },
    { id: "high", label: "High Impact" },
    { id: "improve", label: "To Improve" },
    { id: "good", label: "Good to Have" },
    { id: "completed", label: "Completed" },
  ];

  const filtered =
    activeTab === "all"
      ? suggestions
      : suggestions.filter((s) => s.impact === activeTab);

  const visible = showAll ? filtered : filtered.slice(0, 5);

  return (
    <div className="rounded-2xl border border-[#e8ecf4] bg-white shadow-sm">
      <div className="border-b border-[#e8ecf4] px-4 pt-4 sm:px-5">
        <h2 className="text-base font-bold text-[#0f172a]">Optimization Suggestions</h2>
        <div className="-mx-1 mt-3 flex gap-1 overflow-x-auto pb-0 scrollbar-thin">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-xs font-medium transition-colors",
                activeTab === tab.id
                  ? "border-[#6366f1] text-[#4f46e5]"
                  : "border-transparent text-[#64748b] hover:text-[#334155]"
              )}
            >
              {tab.label} ({tabCounts[tab.id]})
            </button>
          ))}
        </div>
      </div>

      <ul className="divide-y divide-[#e8ecf4]">
        {visible.length === 0 ? (
          <li className="px-5 py-8 text-center text-sm text-[#64748b]">
            {emptyMessage ?? "No suggestions in this category."}
          </li>
        ) : (
          visible.map((s) => {
            const style = IMPACT_STYLES[s.impact];
            return (
              <li key={s.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
                <div className="flex min-w-0 flex-1 gap-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                      style.iconBg
                    )}
                  >
                    <Sparkles className={cn("h-4 w-4", style.iconColor)} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-[#0f172a]">{s.title}</p>
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", style.pill)}>
                        {IMPACT_LABEL[s.impact]}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#64748b]">
                      {s.description}
                    </p>
                  </div>
                </div>
                {s.impact !== "completed" && (
                  <button
                    type="button"
                    onClick={() => onImprove(s)}
                    className="shrink-0 self-start rounded-lg border border-[#c7d2fe] bg-white px-4 py-2 text-xs font-semibold text-[#4f46e5] transition hover:bg-[#eef2ff] sm:self-center"
                  >
                    {s.actionLabel}
                  </button>
                )}
              </li>
            );
          })
        )}
      </ul>

      {filtered.length > 5 && (
        <div className="border-t border-[#e8ecf4] py-3 text-center">
          <button
            type="button"
            onClick={onToggleShowAll}
            className="text-sm font-semibold text-[#4f46e5] hover:underline"
          >
            {showAll ? "Show less" : "View All Suggestions →"}
          </button>
        </div>
      )}
    </div>
  );
}

type ProfileChecklistProps = {
  checklist: ChecklistItem[];
  showAll: boolean;
  onToggleShowAll: () => void;
};

export function ProfileChecklistPanel({ checklist, showAll, onToggleShowAll }: ProfileChecklistProps) {
  const completed = checklist.filter((c) => c.status === "complete").length;
  const visible = showAll ? checklist : checklist.slice(0, 10);

  return (
    <div className="rounded-2xl border border-[#e8ecf4] bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-[#e8ecf4] px-4 py-4 sm:px-5">
        <h2 className="text-base font-bold text-[#0f172a]">Profile Checklist</h2>
        <span className="text-sm font-semibold text-emerald-600">
          {completed}/{checklist.length}
        </span>
      </div>
      <ul className="divide-y divide-[#e8ecf4]">
        {visible.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <ChecklistIcon icon={item.icon} />
              <span className="truncate text-sm text-[#334155]">{item.label}</span>
            </div>
            {item.status === "complete" ? (
              <Check className="h-5 w-5 shrink-0 text-emerald-500" strokeWidth={2.5} />
            ) : item.status === "missing" ? (
              <XCircle className="h-5 w-5 shrink-0 text-red-400" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0 text-amber-500" />
            )}
          </li>
        ))}
      </ul>
      {checklist.length > 10 && (
        <div className="border-t border-[#e8ecf4] py-3 text-center">
          <button
            type="button"
            onClick={onToggleShowAll}
            className="text-sm font-semibold text-[#4f46e5] hover:underline"
          >
            {showAll ? "Show less" : "View Full Checklist →"}
          </button>
        </div>
      )}
    </div>
  );
}

export function LinkedInOptimizerBanner({ onOptimize }: { onOptimize: () => void }) {
  return (
    <div className="flex flex-col items-stretch gap-4 rounded-2xl border border-[#e0e7ff] bg-gradient-to-r from-[#eef2ff] to-[#f5f3ff] p-4 sm:flex-row sm:items-center sm:p-5">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
        <Target className="h-6 w-6 text-[#6366f1]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-[#0f172a]">Stand out to recruiters with a polished LinkedIn profile</p>
        <p className="mt-0.5 text-sm text-[#64748b]">
          Apply AI improvements to your headline, summary, and experience in one place.
        </p>
      </div>
      <button
        type="button"
        onClick={onOptimize}
        className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#6366f1] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4f46e5]"
      >
        <Sparkles className="h-4 w-4" />
        Optimize Now
      </button>
    </div>
  );
}

export function LinkedInSetupCard({
  targetJobTitle,
  onTargetJobTitleChange,
  profilePdf,
  onPdfChange,
  linkedinUrl,
  onLinkedinUrlChange,
  isAnalyzing,
  analysisStep,
  onAnalyze,
  disabled,
}: {
  targetJobTitle: string;
  onTargetJobTitleChange: (v: string) => void;
  profilePdf: File | null;
  onPdfChange: (f: File | null) => void;
  linkedinUrl: string;
  onLinkedinUrlChange: (v: string) => void;
  isAnalyzing: boolean;
  analysisStep: string;
  onAnalyze: () => void;
  disabled: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[#e8ecf4] bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-base font-bold text-[#0f172a]">Analyze your LinkedIn profile</h2>
      <p className="mt-1 text-sm text-[#64748b]">
        Upload a LinkedIn PDF export or paste your profile URL, then enter your target role.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-xs font-medium text-[#475569]">Target job title</label>
          <input
            type="text"
            value={targetJobTitle}
            onChange={(e) => onTargetJobTitleChange(e.target.value)}
            disabled={isAnalyzing}
            placeholder="e.g. Software Engineer"
            className="w-full rounded-xl border border-[#e2e8f0] bg-white px-3 py-2.5 text-sm outline-none ring-[#6366f1] focus:ring-2 disabled:opacity-60"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[#475569]">LinkedIn PDF</label>
          <input
            type="file"
            accept="application/pdf,.pdf"
            disabled={isAnalyzing}
            onChange={(e) => onPdfChange(e.target.files?.[0] ?? null)}
            className="w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[#eef2ff] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#4f46e5]"
          />
          {profilePdf && (
            <p className="mt-1 truncate text-[11px] text-[#64748b]">{profilePdf.name}</p>
          )}
        </div>
        {/* <div>
          <label className="mb-1.5 block text-xs font-medium text-[#475569]">Or profile URL</label>
          <input
            type="url"
            value={linkedinUrl}
            onChange={(e) => onLinkedinUrlChange(e.target.value)}
            disabled={isAnalyzing}
            placeholder="https://linkedin.com/in/..."
            className="w-full rounded-xl border border-[#e2e8f0] bg-white px-3 py-2.5 text-sm outline-none ring-[#6366f1] focus:ring-2 disabled:opacity-60"
          />
        </div> */}
      </div>
      <button
        type="button"
        onClick={onAnalyze}
        disabled={disabled || isAnalyzing}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#6366f1] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#4f46e5] disabled:opacity-50 sm:w-auto sm:min-w-[200px]"
      >
        {isAnalyzing ? (
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {analysisStep || "Run Analysis"}
      </button>
    </div>
  );
}

export function LinkedInPageActions({
  onRefresh,
  onDownloadProfile,
  onExportChecklist,
  isAnalyzing,
  hasReport,
  hasProfile,
}: {
  onRefresh: () => void;
  onDownloadProfile: () => void;
  onExportChecklist: () => void;
  isAnalyzing: boolean;
  hasReport: boolean;
  hasProfile: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onRefresh}
        disabled={isAnalyzing || !hasReport}
        className="flex items-center gap-2 rounded-xl border border-[#e2e8f0] bg-white px-4 py-2 text-sm font-medium text-[#334155] shadow-sm transition hover:bg-[#f8fafc] disabled:opacity-50"
      >
        <RefreshCw className={cn("h-4 w-4", isAnalyzing && "animate-spin")} />
        Refresh Analysis
      </button>
      <button
        type="button"
        onClick={onExportChecklist}
        disabled={!hasReport}
        className="flex items-center gap-2 rounded-xl border border-[#e2e8f0] bg-white px-4 py-2 text-sm font-medium text-[#334155] shadow-sm transition hover:bg-[#f8fafc] disabled:opacity-50"
      >
        <FileText className="h-4 w-4" />
        Export Checklist
      </button>
      <button
        type="button"
        onClick={onDownloadProfile}
        disabled={!hasProfile}
        className="flex items-center gap-2 rounded-xl bg-[#6366f1] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4f46e5] disabled:opacity-50"
      >
        <Download className="h-4 w-4" />
        Download Updated Profile
      </button>
    </div>
  );
}
