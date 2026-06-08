import type { ReactNode } from "react";
import { ChevronRight, FileText, Linkedin, Sparkles, Target, Upload } from "lucide-react";
import { ResumeBuilderProgressStepper } from "@/components/layoffproof/ResumeBuilderProgressStepper";
import { cn } from "@/lib/utils";

const INTRO_VIDEO_EMBED =
  "https://www.youtube-nocookie.com/embed/WXevDBbbB9Y?rel=0&modestbranding=1&playsinline=1";

type ResumeBuilderChooseMethodProps = {
  steps: string[];
  currentStepIndex: number;
  onUpload: () => void;
  onLinkedIn: () => void;
  onScratch: () => void;
};

function ScratchIllustration() {
  return (
    <div className="relative hidden h-28 w-36 shrink-0 sm:block" aria-hidden>
      <div className="absolute bottom-2 right-2 h-[88px] w-[68px] rounded-lg border-2 border-emerald-200 bg-white shadow-md">
        <div className="mt-4 space-y-2 px-3">
          <div className="h-1.5 rounded-full bg-emerald-100" />
          <div className="h-1.5 w-4/5 rounded-full bg-emerald-50" />
          <div className="h-1.5 w-3/5 rounded-full bg-emerald-50" />
          <div className="h-1.5 w-2/3 rounded-full bg-emerald-50" />
        </div>
      </div>
      <div className="absolute bottom-10 right-10 h-12 w-3 rotate-[35deg] rounded-full bg-gradient-to-b from-emerald-300 to-emerald-600 shadow-sm" />
      <div className="absolute bottom-16 right-9 h-3 w-3 rotate-[35deg] rounded-sm bg-emerald-700" />
    </div>
  );
}

type MethodCardProps = {
  icon: ReactNode;
  iconBg: string;
  title: string;
  description: string;
  buttonLabel: string;
  buttonClass: string;
  onClick: () => void;
  className?: string;
  horizontal?: boolean;
  trailing?: ReactNode;
};

function MethodCard({
  icon,
  iconBg,
  title,
  description,
  buttonLabel,
  buttonClass,
  onClick,
  className,
  horizontal,
  trailing,
}: MethodCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group w-full rounded-2xl border border-[#e8ecf4] bg-white p-6 text-left shadow-sm transition hover:border-[#c7d2fe] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c7d2fe]",
        horizontal && "sm:p-7",
        className
      )}
    >
      <div className={cn("flex gap-5", horizontal ? "items-center justify-between" : "flex-col")}>
        <div className={cn("min-w-0", horizontal ? "flex flex-1 items-center gap-5" : "")}>
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
              iconBg
            )}
          >
            {icon}
          </div>
          <div className={cn(horizontal ? "min-w-0 flex-1" : "mt-4")}>
            <h3 className="text-[17px] font-bold text-[#0f172a]">{title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-[#64748b]">{description}</p>
            <span
              className={cn(
                "mt-5 inline-flex h-10 items-center gap-1.5 rounded-lg px-4 text-sm font-semibold text-white transition group-hover:opacity-90",
                horizontal ? "mt-4" : "",
                buttonClass
              )}
            >
              {buttonLabel}
              <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
            </span>
          </div>
        </div>
        {trailing}
      </div>
    </button>
  );
}

export function ResumeBuilderChooseMethod({
  steps,
  currentStepIndex,
  onUpload,
  onLinkedIn,
  onScratch,
}: ResumeBuilderChooseMethodProps) {
  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <ResumeBuilderProgressStepper steps={steps} currentStepIndex={currentStepIndex} />

      {/* Walkthrough */}
      <div className="overflow-hidden rounded-2xl border border-[#e8ecf4] bg-white p-6 shadow-sm sm:p-8">
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-10">
          <div className="space-y-5">
            <span className="inline-block rounded-full bg-[#f5f3ff] px-3 py-1 text-xs font-semibold text-[#6366f1]">
              Walkthrough
            </span>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-[#0f172a]">
                See the AI resume builder in action
              </h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-[#64748b]">
                A quick tour of Layoff Proof before you upload, import from LinkedIn, or start
                from scratch.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2.5 rounded-xl border border-[#e8ecf4] bg-[#fafbff] px-4 py-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f5f3ff] text-[#6366f1]">
                  <Sparkles className="h-4 w-4" strokeWidth={2} />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#0f172a]">AI-Powered</p>
                  <p className="text-[11px] text-[#94a3b8]">Smart suggestions</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl border border-[#e8ecf4] bg-[#fafbff] px-4 py-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <Target className="h-4 w-4" strokeWidth={2} />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#0f172a]">ATS-Optimized</p>
                  <p className="text-[11px] text-[#94a3b8]">Better interview chances</p>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-[#e8ecf4] bg-[#0f172a] shadow-lg">
            <div className="border-b border-white/10 px-4 py-2.5">
              <p className="text-xs font-medium text-white/80">AI Resume Builder Explained</p>
            </div>
            <div className="aspect-video w-full">
              <iframe
                src={INTRO_VIDEO_EMBED}
                title="AI Resume Builder intro video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                className="h-full w-full border-0"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Build Your Resume */}
      <section>
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef2ff] text-[#6366f1]">
            <FileText className="h-5 w-5" strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#0f172a]">Build Your Resume</h2>
            <p className="text-sm text-[#64748b]">Choose how you&apos;d like to get started</p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <MethodCard
            icon={<Upload className="h-6 w-6 text-[#6366f1]" strokeWidth={2} />}
            iconBg="bg-[#f5f3ff]"
            title="Upload Existing Resume"
            description="We'll extract the info and help you build a better resume."
            buttonLabel="Upload Resume"
            buttonClass="bg-[#6366f1] hover:bg-[#4f46e5]"
            onClick={onUpload}
          />
          <MethodCard
            icon={<Linkedin className="h-6 w-6 text-[#0a66c2]" strokeWidth={2} />}
            iconBg="bg-[#eff6ff]"
            title="Import from LinkedIn"
            description="Pull your profile data from LinkedIn and build instantly."
            buttonLabel="Connect LinkedIn"
            buttonClass="bg-[#0a66c2] hover:bg-[#004182]"
            onClick={onLinkedIn}
          />
        </div>

        <div className="mt-5">
          <MethodCard
            horizontal
            icon={<FileText className="h-6 w-6 text-emerald-600" strokeWidth={2} />}
            iconBg="bg-emerald-50"
            title="Start From Scratch"
            description="Fill in your details manually using our guided form and AI suggestions."
            buttonLabel="Start Building"
            buttonClass="bg-emerald-600 hover:bg-emerald-700"
            onClick={onScratch}
            trailing={<ScratchIllustration />}
          />
        </div>
      </section>
    </div>
  );
}
