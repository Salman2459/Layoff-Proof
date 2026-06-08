import { FileText } from "lucide-react";

function Sparkle({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 1.5L13.35 9.6L21 10.9L13.35 12.2L12 20.5L10.65 12.2L3 10.9L10.65 9.6L12 1.5Z"
        fill="#c4b5fd"
      />
    </svg>
  );
}

export function CoverLetterPreviewEmpty() {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-16 text-center">
      <div className="relative mb-5">
        <div className="absolute inset-0 scale-150 rounded-full bg-[#ede9fe]/60 blur-2xl" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#ede9fe] to-[#ddd6fe] shadow-inner">
          <FileText className="h-9 w-9 text-[#8b5cf6]" strokeWidth={1.5} />
        </div>
        <Sparkle size={12} className="absolute -right-2 -top-1" />
        <Sparkle size={8} className="absolute -left-3 top-2 opacity-70" />
        <Sparkle size={10} className="absolute -bottom-1 right-0 opacity-80" />
      </div>
      <p className="text-base font-bold text-[#0f172a]">No cover letter generated yet</p>
      <p className="mt-2 max-w-[280px] text-sm leading-relaxed text-[#64748b]">
        Upload your resume or fill the details to generate a personalized cover letter.
      </p>
    </div>
  );
}
