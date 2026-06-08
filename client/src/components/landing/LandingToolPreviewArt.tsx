import type { ReactNode } from "react";
import {
  Bot,
  Check,
  FileText,
  Lightbulb,
  Mail,
  Sparkles,
  Star,
  TrendingUp,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Stock photos for LinkedIn optimizer landing preview */
const LINKEDIN_PREVIEW_IMAGES = {
  cover:
    "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=720&h=180&q=80",
  profile:
    "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=160&h=160&q=80",
} as const;

function PreviewFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("relative mx-auto w-full max-w-[540px]", className)}>
      <div
        className="pointer-events-none absolute -inset-3 rounded-[32px] bg-gradient-to-br from-[#5D5FEF]/12 via-indigo-100/30 to-violet-100/20"
        aria-hidden
      />
      <div className="relative overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-[0_28px_56px_-16px_rgba(15,23,42,0.14),0_12px_24px_-8px_rgba(93,95,239,0.12)]">
        {children}
      </div>
    </div>
  );
}

function BrowserChrome({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <div className="flex items-center gap-2 border-b border-[#e8ecf4] bg-[#f8fafc] px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#fca5a5]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#fcd34d]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#86efac]" />
        </div>
        <div className="mx-auto flex h-6 min-w-0 flex-1 max-w-[220px] items-center justify-center rounded-md bg-white px-3 text-[10px] font-medium text-[#94a3b8]">
          <span className="truncate">{title}</span>
        </div>
      </div>
      {children}
    </>
  );
}

function ResumePreview() {
  return (
    <PreviewFrame>
      <BrowserChrome title="layoffproof.com/resume-builder">
        <div className="grid min-h-[300px] grid-cols-[1fr_200px] bg-[#f4f6fb]">
          <div className="border-r border-[#e8ecf4] bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[11px] font-bold text-[#0f172a]">Resume Editor</p>
              <span className="rounded-md bg-[#eef2ff] px-2 py-0.5 text-[9px] font-semibold text-[#5D5FEF]">
                Modern Pro
              </span>
            </div>
            <div className="space-y-3">
              {[
                { label: "Full Name", value: "Sarah Chen" },
                { label: "Job Title", value: "Product Manager" },
                { label: "Summary", value: "Results-driven PM with 6+ years..." },
              ].map((field) => (
                <div key={field.label}>
                  <p className="text-[9px] font-medium text-[#94a3b8]">{field.label}</p>
                  <div className="mt-1 rounded-lg border border-[#e8ecf4] bg-[#fafbfc] px-2.5 py-1.5 text-[10px] text-[#334155]">
                    {field.value}
                  </div>
                </div>
              ))}
              <div className="rounded-lg border border-dashed border-[#c7d2fe] bg-[#eef2ff]/50 p-2 text-center text-[9px] font-medium text-[#5D5FEF]">
                + Add Experience with AI
              </div>
            </div>
          </div>
          <div className="p-3">
            <p className="mb-2 text-[9px] font-semibold text-[#64748b]">Live Preview</p>
            <div className="aspect-[8.5/11] overflow-hidden rounded-lg border border-[#e8ecf4] bg-white p-2.5 shadow-sm">
              <div className="mb-2 border-b-2 border-[#1e3a5f] pb-1.5">
                <p className="text-[10px] font-bold text-[#0f172a]">Sarah Chen</p>
                <p className="text-[8px] text-[#64748b]">Product Manager</p>
              </div>
              <p className="mb-1 text-[7px] font-bold uppercase tracking-wide text-[#5D5FEF]">
                Summary
              </p>
              <div className="mb-2 space-y-1">
                <div className="h-1 w-full rounded bg-[#e2e8f0]" />
                <div className="h-1 w-[92%] rounded bg-[#e2e8f0]" />
                <div className="h-1 w-[85%] rounded bg-[#e2e8f0]" />
              </div>
              <p className="mb-1 text-[7px] font-bold uppercase tracking-wide text-[#5D5FEF]">
                Experience
              </p>
              <div className="space-y-1">
                <div className="h-1 w-full rounded bg-[#e2e8f0]" />
                <div className="h-1 w-[78%] rounded bg-[#e2e8f0]" />
              </div>
            </div>
          </div>
        </div>
      </BrowserChrome>
    </PreviewFrame>
  );
}

function LinkedInPreview() {
  return (
    <PreviewFrame>
      <div className="bg-white p-5">
        <div className="overflow-hidden rounded-xl border border-[#e8ecf4]">
          <div
            className="h-20 bg-cover bg-center"
            style={{ backgroundImage: `url('${LINKEDIN_PREVIEW_IMAGES.cover}')` }}
            role="img"
            aria-label="LinkedIn cover preview"
          />
          <div className="relative px-4 pb-4">
            <img
              src={LINKEDIN_PREVIEW_IMAGES.profile}
              alt="Sarah Chen profile"
              className="-mt-8 h-16 w-16 rounded-full border-4 border-white object-cover shadow-sm"
              loading="lazy"
            />
            <p className="mt-2 text-[13px] font-bold text-[#0f172a]">Sarah Chen</p>
            <p className="text-[10px] text-[#64748b]">Product Manager · Open to work</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-[#e8ecf4] bg-[#fafbfc] p-3">
                <p className="text-[9px] font-medium text-[#64748b]">Profile Strength</p>
                <div className="mt-2 flex items-center gap-3">
                  <div className="relative h-14 w-14">
                    <svg className="h-14 w-14 -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="14" fill="none" stroke="#e2e8f0" strokeWidth="2.5" />
                      <circle
                        cx="18"
                        cy="18"
                        r="14"
                        fill="none"
                        stroke="#5D5FEF"
                        strokeWidth="2.5"
                        strokeDasharray="78 100"
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-sm font-bold text-[#0f172a]">78</span>
                    </span>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-emerald-600">Good</p>
                    <p className="text-[9px] text-[#94a3b8]">+12 pts possible</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-[#e8ecf4] bg-[#fafbfc] p-3">
                <p className="text-[9px] font-medium text-[#64748b]">AI Suggestions</p>
                <ul className="mt-2 space-y-1.5">
                  {["Stronger headline", "Add keywords", "Expand summary"].map((tip) => (
                    <li key={tip} className="flex items-center gap-1.5 text-[9px] text-[#475569]">
                      <Sparkles className="h-3 w-3 shrink-0 text-[#5D5FEF]" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PreviewFrame>
  );
}

function CoverLetterPreview() {
  return (
    <PreviewFrame>
      <BrowserChrome title="layoffproof.com/cover-letter">
        <div className="grid min-h-[300px] grid-cols-2 bg-[#f8fafc]">
          <div className="border-r border-[#e8ecf4] bg-white p-4">
            <p className="text-[11px] font-bold text-[#0f172a]">Job Details</p>
            <div className="mt-3 space-y-2">
              <div className="rounded-lg border border-[#e8ecf4] p-2.5">
                <p className="text-[10px] font-semibold text-[#0f172a]">Senior PM — Stripe</p>
                <p className="mt-0.5 text-[9px] text-[#64748b]">Remote · Full-time</p>
              </div>
              <button
                type="button"
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#5D5FEF] py-2 text-[10px] font-semibold text-white"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Generate with AI
              </button>
            </div>
          </div>
          <div className="p-4">
            <div className="flex items-center gap-2 text-[#5D5FEF]">
              <Mail className="h-4 w-4" />
              <p className="text-[11px] font-bold text-[#0f172a]">Cover Letter</p>
            </div>
            <div className="mt-3 rounded-xl border border-[#e8ecf4] bg-white p-3 shadow-sm">
              <p className="text-[9px] leading-relaxed text-[#475569]">
                Dear Hiring Manager,
              </p>
              <div className="mt-2 space-y-1.5">
                {[100, 95, 88, 92, 70].map((w, i) => (
                  <div
                    key={i}
                    className="h-1.5 rounded bg-[#e2e8f0]"
                    style={{ width: `${w}%` }}
                  />
                ))}
              </div>
              <p className="mt-3 text-[9px] font-medium text-[#5D5FEF]">Best regards, Sarah</p>
            </div>
            <div className="mt-2 flex gap-2">
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[8px] font-medium text-emerald-700">
                ATS-friendly
              </span>
              <span className="rounded-full bg-[#eef2ff] px-2 py-0.5 text-[8px] font-medium text-[#5D5FEF]">
                Tailored
              </span>
            </div>
          </div>
        </div>
      </BrowserChrome>
    </PreviewFrame>
  );
}

function AutoApplyPreview() {
  return (
    <PreviewFrame>
      <div className="bg-[#f8fafc] p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-white">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[12px] font-bold text-[#0f172a]">AI Auto Apply</p>
              <p className="text-[9px] text-[#64748b]">12 matches today</p>
            </div>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-semibold text-emerald-700">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            Active
          </span>
        </div>
        <div className="space-y-2">
          {[
            { company: "Google", role: "Product Manager", match: 94, status: "Applied" },
            { company: "Meta", role: "Senior PM", match: 89, status: "Queued" },
            { company: "Airbnb", role: "Growth PM", match: 86, status: "Review" },
          ].map((job) => (
            <div
              key={job.company}
              className="flex items-center gap-3 rounded-xl border border-[#e8ecf4] bg-white p-3 shadow-sm"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#f1f5f9] text-[11px] font-bold text-[#64748b]">
                {job.company.slice(0, 2)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-semibold text-[#0f172a]">{job.role}</p>
                <p className="text-[9px] text-[#64748b]">{job.company}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-[#5D5FEF]">{job.match}%</p>
                <p className="text-[8px] text-[#94a3b8]">{job.status}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PreviewFrame>
  );
}

function InterviewPreview() {
  return (
    <PreviewFrame>
      <BrowserChrome title="layoffproof.com/interview-preparation">
        <div className="bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-[11px] font-bold text-[#0f172a]">Question 2 of 5</p>
            <span className="shrink-0 rounded-full border border-[#e2e8f0] px-2 py-0.5 text-[9px] font-medium text-[#64748b]">
              Behavioral
            </span>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
            <p className="text-[10px] font-medium leading-relaxed text-blue-900">
              Tell me about a time you led a cross-functional project. What was the outcome?
            </p>
          </div>

          <div className="mt-2.5 rounded-lg border border-[#e8ecf4] bg-[#f8fafc] p-2.5">
            <p className="flex items-center gap-1.5 text-[9px] font-semibold text-[#475569]">
              <Lightbulb className="h-3 w-3 shrink-0 text-amber-500" />
              Keep in mind why they&apos;re asking
            </p>
            <p className="mt-1 text-[9px] leading-relaxed text-[#64748b]">
              They want evidence of leadership, collaboration, and measurable impact.
            </p>
          </div>

          <div className="mt-3">
            <p className="mb-1.5 text-[9px] font-medium text-[#475569]">Your Answer</p>
            <div className="min-h-[80px] rounded-lg border border-[#e2e8f0] bg-white p-2.5 shadow-inner">
              <p className="text-[9px] leading-relaxed text-[#334155]">
                At my last company I led a team of 8 across design and engineering to launch a
                new onboarding flow. We reduced drop-off by 23% and shipped two weeks ahead of
                schedule.
              </p>
            </div>
          </div>

          <div className="mt-3 rounded-lg bg-blue-50 p-2.5">
            <p className="text-[9px] font-semibold text-blue-900">AI Feedback</p>
            <p className="mt-1 text-[9px] leading-relaxed text-blue-800">
              Great structure — try adding a metric to your impact statement.
            </p>
          </div>

          <div className="mt-2 flex items-center justify-between rounded-lg border border-[#e8ecf4] bg-gradient-to-r from-green-50 to-blue-50 px-2.5 py-2">
            <span className="flex items-center gap-1.5 text-[9px] font-semibold text-[#0f172a]">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              Interview Results
            </span>
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[8px] font-semibold text-green-800">
              Score: 8.5/10
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="rounded-md border border-[#e2e8f0] px-2.5 py-1 text-[9px] font-medium text-[#64748b]">
              Previous
            </span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full",
                    i === 2 ? "w-4 bg-[#5D5FEF]" : "w-1.5 bg-[#cbd5e1]"
                  )}
                />
              ))}
            </div>
            <span className="rounded-md bg-gradient-to-r from-blue-500 to-[#5D5FEF] px-2.5 py-1 text-[9px] font-semibold text-white">
              Next Question
            </span>
          </div>
        </div>
      </BrowserChrome>
    </PreviewFrame>
  );
}

function TrackerPreview() {
  return (
    <PreviewFrame>
      <BrowserChrome title="layoffproof.com/job-tracker">
        <div className="bg-[#f8fafc] p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold text-[#0f172a]">Application Pipeline</p>
            <span className="text-[9px] font-medium text-[#64748b]">18 active</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              {
                col: "Applied",
                color: "bg-sky-500",
                cards: ["Stripe PM", "Meta PM"],
              },
              {
                col: "Interview",
                color: "bg-violet-500",
                cards: ["Google PM"],
              },
              {
                col: "Assessment",
                color: "bg-amber-500",
                cards: ["Amazon PM"],
              },
              {
                col: "Offer",
                color: "bg-emerald-500",
                cards: [],
              },
            ].map(({ col, color, cards }) => (
              <div key={col} className="min-h-[160px] rounded-xl border border-[#e8ecf4] bg-white p-2">
                <div className="mb-2 flex items-center gap-1.5">
                  <span className={cn("h-1.5 w-1.5 rounded-full", color)} />
                  <p className="text-[9px] font-semibold text-[#64748b]">{col}</p>
                  <span className="ml-auto text-[8px] text-[#94a3b8]">{cards.length}</span>
                </div>
                {cards.map((title) => (
                  <div
                    key={title}
                    className="mb-1.5 rounded-lg border border-[#e8ecf4] bg-[#fafbfc] p-2 shadow-sm"
                  >
                    <p className="text-[9px] font-semibold text-[#334155]">{title}</p>
                    <p className="mt-0.5 text-[8px] text-[#94a3b8]">Updated 2d ago</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </BrowserChrome>
    </PreviewFrame>
  );
}

function AnalyzerPreview() {
  return (
    <PreviewFrame>
      <div className="bg-white p-5">
        <div className="flex gap-4">
          <div className="flex shrink-0 flex-col items-center rounded-2xl border border-[#e8ecf4] bg-[#fafbfc] p-4">
            <p className="text-[10px] font-medium text-[#64748b]">ATS Score</p>
            <div className="relative mt-2 h-28 w-28">
              <svg className="h-28 w-28 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="14" fill="none" stroke="#e2e8f0" strokeWidth="2" />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="2"
                  strokeDasharray="78 100"
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-[#0f172a]">78</span>
                <span className="text-[9px] text-[#64748b]">Good</span>
              </span>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-bold text-[#0f172a]">Improvement Tips</p>
            <ul className="mt-3 space-y-2">
              {[
                { tip: "Add more action verbs", done: true },
                { tip: "Include role-specific keywords", done: false },
                { tip: "Quantify achievements", done: false },
                { tip: "Shorten summary section", done: true },
              ].map((item) => (
                <li
                  key={item.tip}
                  className="flex items-start gap-2 rounded-lg border border-[#e8ecf4] bg-[#fafbfc] px-2.5 py-2"
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
                      item.done ? "bg-emerald-100 text-emerald-600" : "bg-[#eef2ff] text-[#5D5FEF]"
                    )}
                  >
                    {item.done ? (
                      <Check className="h-2.5 w-2.5" strokeWidth={3} />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    )}
                  </span>
                  <span className="text-[10px] text-[#475569]">{item.tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </PreviewFrame>
  );
}

function SkillsPreview() {
  return (
    <PreviewFrame>
      <BrowserChrome title="layoffproof.com/skills-assessment">
        <div className="bg-[#f8fafc] p-4">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-red-500 text-white">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-[#0f172a]">Skills Assessment</p>
              <p className="text-[9px] text-[#64748b]">Target role: Senior Product Manager</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-[#e8ecf4] bg-white p-3">
              <p className="text-[9px] font-medium text-[#64748b]">Your Strengths</p>
              <div className="mt-2 space-y-2">
                {[
                  { skill: "Product Strategy", pct: 92 },
                  { skill: "User Research", pct: 85 },
                  { skill: "Roadmapping", pct: 78 },
                ].map((s) => (
                  <div key={s.skill}>
                    <div className="flex justify-between text-[9px]">
                      <span className="text-[#334155]">{s.skill}</span>
                      <span className="font-semibold text-emerald-600">{s.pct}%</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#e2e8f0]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500"
                        style={{ width: `${s.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-[#e8ecf4] bg-white p-3">
              <p className="text-[9px] font-medium text-[#64748b]">Growth Areas</p>
              <ul className="mt-2 space-y-2">
                {["SQL & Analytics", "A/B Testing", "Stakeholder Mgmt"].map((skill) => (
                  <li
                    key={skill}
                    className="flex items-center justify-between rounded-lg bg-[#fff7ed] px-2 py-1.5"
                  >
                    <span className="text-[9px] font-medium text-[#9a3412]">{skill}</span>
                    <TrendingUp className="h-3 w-3 text-orange-500" />
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="mt-3 w-full rounded-lg bg-[#5D5FEF] py-1.5 text-[9px] font-semibold text-white"
              >
                View Learning Path
              </button>
            </div>
          </div>
        </div>
      </BrowserChrome>
    </PreviewFrame>
  );
}

const PREVIEWS: Record<string, () => JSX.Element> = {
  resume: ResumePreview,
  linkedin: LinkedInPreview,
  cover: CoverLetterPreview,
  "auto-apply": AutoApplyPreview,
  interview: InterviewPreview,
  tracker: TrackerPreview,
  analyzer: AnalyzerPreview,
  skills: SkillsPreview,
};

export function LandingToolPreviewArt({ id }: { id: string }) {
  const Preview = PREVIEWS[id];
  if (!Preview) {
    return (
      <PreviewFrame>
        <div className="flex h-[300px] items-center justify-center bg-gradient-to-br from-[#f4f6fb] to-white">
          <FileText className="h-12 w-12 text-[#5D5FEF]/40" />
        </div>
      </PreviewFrame>
    );
  }
  return <Preview />;
}
