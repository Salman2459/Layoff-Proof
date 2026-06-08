import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TemplatePreviewVariant } from "./layoffproof-template-catalog";

const NAME = "John Doe";
const TITLE = "Software Engineer";

function Line({ className }: { className?: string }) {
  return <div className={cn("rounded-full bg-slate-200", className)} />;
}

function SectionTitle({ className, children }: { className?: string; children: string }) {
  return (
    <p className={cn("text-[5px] font-bold uppercase tracking-wide", className)}>
      {children}
    </p>
  );
}

type Props = { variant: TemplatePreviewVariant; className?: string };

export function ResumeTemplatePreviewArt({ variant, className }: Props) {
  switch (variant) {
    case "modern-professional":
      return (
        <div className={cn("flex h-full overflow-hidden bg-white text-[4px]", className)}>
          <div className="flex w-[28%] flex-col bg-[#1e3a5f] px-1 py-1.5 text-white">
            <div className="mx-auto mb-1 h-3 w-3 rounded-full bg-slate-400" />
            <Line className="mb-0.5 h-[2px] w-full bg-slate-500" />
            <Line className="mb-1 h-[2px] w-3/4 bg-slate-500" />
            <SectionTitle className="mb-0.5 text-[4px] text-blue-200">Education</SectionTitle>
            <Line className="mb-0.5 h-[2px] w-full bg-slate-500" />
            <SectionTitle className="mb-0.5 mt-1 text-[4px] text-blue-200">Tools</SectionTitle>
            <Line className="h-[2px] w-full bg-slate-500" />
          </div>
          <div className="flex flex-1 flex-col p-1.5">
            <p className="text-[7px] font-bold text-slate-900">{NAME}</p>
            <p className="mb-1 text-[5px] text-slate-500">{TITLE}</p>
            <SectionTitle className="mb-0.5 text-blue-600">Summary</SectionTitle>
            <Line className="mb-0.5 h-[2px] w-full" />
            <Line className="mb-1 h-[2px] w-4/5" />
            <SectionTitle className="mb-0.5 text-blue-600">Experience</SectionTitle>
            <Line className="mb-0.5 h-[2px] w-full" />
            <Line className="h-[2px] w-3/4" />
          </div>
        </div>
      );

    case "minimal-clean":
      return (
        <div className={cn("flex h-full flex-col items-center bg-white px-2 py-2", className)}>
          <p className="text-[7px] font-bold tracking-wide text-slate-900">{NAME.toUpperCase()}</p>
          <p className="mb-1 text-[5px] text-slate-500">{TITLE.toUpperCase()}</p>
          <Line className="mb-2 h-[2px] w-[90%] bg-slate-300" />
          <div className="w-full space-y-1.5">
            <SectionTitle className="text-slate-700">Summary</SectionTitle>
            <Line className="h-[2px] w-full" />
            <SectionTitle className="text-slate-700">Experience</SectionTitle>
            <Line className="h-[2px] w-full" />
            <Line className="h-[2px] w-4/5" />
          </div>
          <div className="mt-auto flex w-full flex-wrap justify-center gap-0.5 pt-1">
            {["JS", "TS", "React"].map((s) => (
              <span
                key={s}
                className="rounded-full bg-slate-100 px-1 py-px text-[4px] text-slate-600"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      );

    case "creative-sidebar":
      return (
        <div className={cn("flex h-full overflow-hidden bg-white", className)}>
          <div className="flex w-[30%] flex-col bg-[#14b8a6] px-1 py-1.5 text-white">
            <div className="mx-auto mb-1 h-3.5 w-3.5 rounded-full border border-teal-200 bg-teal-300" />
            <p className="text-center text-[5px] font-bold">{NAME.split(" ")[0]}</p>
            <Line className="my-1 h-[2px] w-full bg-teal-300/80" />
            <SectionTitle className="text-teal-100">Skills</SectionTitle>
            <Line className="mt-0.5 h-[2px] w-full bg-teal-300/80" />
          </div>
          <div className="flex flex-1 flex-col p-1.5">
            <SectionTitle className="text-teal-700">About Me</SectionTitle>
            <Line className="mb-1 h-[2px] w-full" />
            <SectionTitle className="text-teal-700">Experience</SectionTitle>
            <Line className="h-[2px] w-full" />
            <Line className="mt-0.5 h-[2px] w-4/5" />
          </div>
        </div>
      );

    case "classic-professional":
      return (
        <div className={cn("flex h-full flex-col overflow-hidden bg-white", className)}>
          <div className="bg-[#1e3a5f] px-2 py-1">
            <p className="text-[6px] font-bold text-white">{NAME}</p>
            <p className="text-[4px] text-blue-100">{TITLE}</p>
          </div>
          <div className="grid flex-1 grid-cols-2 gap-1 p-1.5">
            <div className="space-y-1">
              <Line className="h-[2px] w-full" />
              <SectionTitle className="text-slate-600">Education</SectionTitle>
              <Line className="h-[2px] w-full" />
            </div>
            <div className="space-y-1">
              <SectionTitle className="text-blue-600">Experience</SectionTitle>
              <Line className="h-[2px] w-full" />
              <Line className="h-[2px] w-4/5" />
            </div>
          </div>
        </div>
      );

    case "executive":
      return (
        <div className={cn("flex h-full flex-col bg-white p-1.5", className)}>
          <div className="mb-1 flex items-center gap-1">
            <div className="h-3.5 w-3.5 shrink-0 rounded-full bg-slate-300" />
            <div>
              <p className="text-[6px] font-bold text-slate-900">{NAME}</p>
              <p className="text-[4px] text-slate-500">{TITLE}</p>
            </div>
          </div>
          <Line className="mb-1 h-[2px] w-full bg-slate-200" />
          <SectionTitle className="text-slate-700">Summary</SectionTitle>
          <Line className="mb-1 h-[2px] w-full" />
          <SectionTitle className="text-slate-700">Experience</SectionTitle>
          <Line className="h-[2px] w-full" />
        </div>
      );

    case "elegant":
      return (
        <div className={cn("flex h-full flex-col overflow-hidden bg-white", className)}>
          <div className="bg-[#fce7d6] px-2 py-1.5 text-center">
            <p className="text-[6px] font-bold text-slate-800">{NAME}</p>
            <p className="text-[4px] text-slate-600">{TITLE}</p>
            <Line className="mx-auto mt-1 h-[2px] w-3/4 bg-orange-200" />
          </div>
          <div className="flex flex-1 flex-col gap-1 p-1.5">
            <SectionTitle className="text-orange-800/80">Experience</SectionTitle>
            <Line className="h-[2px] w-full" />
            <SectionTitle className="text-orange-800/80">Education</SectionTitle>
            <Line className="h-[2px] w-4/5" />
          </div>
        </div>
      );

    case "two-column":
      return (
        <div className={cn("flex h-full overflow-hidden bg-white", className)}>
          <div className="w-[28%] bg-[#1e293b] p-1 text-white">
            <p className="mb-1 text-[5px] font-bold text-slate-300">JD</p>
            <Line className="mb-1 h-[2px] w-full bg-slate-600" />
            <SectionTitle className="text-slate-400">Skills</SectionTitle>
            <Line className="mt-0.5 h-[2px] w-full bg-slate-600" />
          </div>
          <div className="flex flex-1 flex-col p-1.5">
            <p className="text-[6px] font-bold">{NAME}</p>
            <p className="mb-1 text-[4px] text-slate-500">{TITLE}</p>
            <SectionTitle className="text-slate-700">Summary</SectionTitle>
            <Line className="h-[2px] w-full" />
          </div>
        </div>
      );

    case "techie":
      return (
        <div
          className={cn(
            "flex h-full flex-col bg-[#0a0a0a] p-1.5 font-mono text-[4px] text-[#22c55e]",
            className
          )}
        >
          <p className="text-[6px] font-bold">
            &gt; {NAME}
            <span className="animate-pulse">_</span>
          </p>
          <p className="mb-1 text-[#86efac]">// {TITLE}</p>
          <p className="text-[#4ade80]">// ABOUT ME</p>
          <Line className="mb-1 h-[2px] w-full bg-green-900" />
          <p className="text-[#4ade80]">// EXPERIENCE</p>
          <Line className="mb-1 h-[2px] w-full bg-green-900" />
          <div className="mt-auto flex flex-wrap gap-0.5">
            {["JS", "Node"].map((s) => (
              <span
                key={s}
                className="rounded border border-green-600 px-0.5 text-[3px] text-green-400"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      );

    case "academic":
      return (
        <div className={cn("flex h-full flex-col bg-white p-1.5", className)}>
          <div className="mb-1 flex items-center gap-0.5">
            <GraduationCap className="h-2.5 w-2.5 text-blue-600" strokeWidth={2.5} />
            <p className="text-[6px] font-bold text-slate-900">{NAME}</p>
          </div>
          <p className="mb-1 text-[4px] text-slate-500">{TITLE}</p>
          <SectionTitle className="text-blue-700">Education</SectionTitle>
          <Line className="mb-1 h-[2px] w-full" />
          <SectionTitle className="text-blue-700">Research</SectionTitle>
          <Line className="h-[2px] w-4/5" />
        </div>
      );

    case "minimalist":
      return (
        <div className={cn("flex h-full flex-col bg-white p-1.5", className)}>
          <div className="mb-1 flex items-start justify-between gap-1">
            <div>
              <p className="text-[6px] font-bold text-slate-900">{NAME}</p>
              <p className="text-[4px] text-slate-500">{TITLE}</p>
            </div>
            <Line className="h-[2px] w-8 bg-slate-200" />
          </div>
          <SectionTitle className="text-slate-600">Summary</SectionTitle>
          <Line className="mb-1 h-[2px] w-full" />
          <SectionTitle className="text-slate-600">Experience</SectionTitle>
          <Line className="h-[2px] w-full" />
          <p className="mt-auto text-[3px] text-slate-400">JS · TS · React</p>
        </div>
      );

    default:
      return <div className={cn("h-full bg-slate-50", className)} />;
  }
}
