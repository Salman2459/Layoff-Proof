import {
  ArrowLeft,
  ExternalLink,
  Globe,
  Info,
  Lightbulb,
  Link2,
  Loader2,
  Pencil,
  Shield,
  Target,
  User,
  Zap,
} from "lucide-react";
import { LinkedInImportIllustration } from "@/components/layoffproof/LinkedInImportIllustration";
import { ResumeBuilderProgressStepper } from "@/components/layoffproof/ResumeBuilderProgressStepper";
import { layoffproofInputClass } from "@/components/layoffproof/resume-builder-ui";

type ResumeBuilderLinkedInImportProps = {
  steps: string[];
  currentStepIndex: number;
  linkedinUrl: string;
  onLinkedinUrlChange: (url: string) => void;
  onBack: () => void;
  onImport: () => void;
  isImporting: boolean;
};

const FEATURES = [
  { icon: Zap, title: "Fast & Easy", sub: "Import in seconds" },
  { icon: Target, title: "Accurate Data", sub: "High precision import" },
  { icon: Shield, title: "Secure & Private", sub: "100% safe & secure" },
] as const;

const TIPS = [
  { icon: User, text: "Ensure your LinkedIn profile is up to date" },
  { icon: Globe, text: "Make your profile public temporarily" },
  { icon: Pencil, text: "Review and edit after import for best results" },
] as const;

export function ResumeBuilderLinkedInImport({
  steps,
  currentStepIndex,
  linkedinUrl,
  onLinkedinUrlChange,
  onBack,
  onImport,
  isImporting,
}: ResumeBuilderLinkedInImportProps) {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <ResumeBuilderProgressStepper steps={steps} currentStepIndex={currentStepIndex} />

      <div className="overflow-hidden rounded-2xl border border-[#e8ecf4] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="grid items-center gap-8 p-7 sm:p-8 lg:grid-cols-[1fr_300px] lg:gap-10 lg:p-10">
          <div className="min-w-0">
            <span className="inline-flex rounded-full bg-[#f5f3ff] px-3 py-1 text-[11px] font-semibold text-[#6366f1]">
              Step {currentStepIndex + 1} of {steps.length}
            </span>

            <h2 className="mt-4 text-[26px] font-bold tracking-tight text-[#0f172a] sm:text-[28px]">
              Import from{" "}
              <span className="text-[#6366f1]">LinkedIn</span>
            </h2>
            <p className="mt-2 max-w-lg text-[14px] leading-relaxed text-[#64748b]">
              Enter your public LinkedIn profile URL and we&apos;ll instantly import your
              information.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, sub }) => (
                <div
                  key={title}
                  className="rounded-xl border border-[#e8ecf4] bg-[#fafbff] px-3 py-3"
                >
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-[#f5f3ff] text-[#6366f1]">
                    <Icon className="h-4 w-4" strokeWidth={2} />
                  </div>
                  <p className="text-[12px] font-bold text-[#0f172a]">{title}</p>
                  <p className="text-[11px] text-[#94a3b8]">{sub}</p>
                </div>
              ))}
            </div>

            <div className="mt-7">
              <label
                htmlFor="linkedin-url"
                className="mb-2 block text-[13px] font-semibold text-[#334155]"
              >
                LinkedIn Profile URL
              </label>
              <div className="relative">
                <Link2 className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                <input
                  id="linkedin-url"
                  type="url"
                  placeholder="https://www.linkedin.com/in/your-profile"
                  value={linkedinUrl}
                  onChange={(e) => onLinkedinUrlChange(e.target.value)}
                  className={`${layoffproofInputClass} h-12 w-full pl-11`}
                />
              </div>
              <p className="mt-2 flex items-start gap-1.5 text-[12px] text-[#94a3b8]">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#a5b4fc]" strokeWidth={2} />
                Make sure your profile is public to import all your information.
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onBack}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#e2e8f0] bg-white px-5 text-[14px] font-semibold text-[#334155] shadow-sm transition hover:bg-[#f8fafc]"
              >
                <ArrowLeft className="h-4 w-4" strokeWidth={2} />
                Back
              </button>
              <button
                type="button"
                onClick={onImport}
                disabled={isImporting || !linkedinUrl.trim()}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#6366f1] via-[#8b5cf6] to-[#a855f7] px-5 text-[14px] font-semibold text-white shadow-md shadow-indigo-200/60 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4" strokeWidth={2} />
                    Import from LinkedIn
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="hidden lg:flex lg:items-center lg:justify-center">
            <LinkedInImportIllustration />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[#e8ecf4] bg-[#f8fafc] px-6 py-5 sm:px-8">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f5f3ff] text-[#6366f1]">
            <Lightbulb className="h-4 w-4" strokeWidth={2} />
          </div>
          <h3 className="text-[14px] font-bold text-[#0f172a]">Tips for better results</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {TIPS.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-start gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-[#6366f1] shadow-sm">
                <Icon className="h-3.5 w-3.5" strokeWidth={2} />
              </div>
              <p className="text-[12px] leading-relaxed text-[#64748b]">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
