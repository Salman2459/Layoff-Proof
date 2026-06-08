import { FileText, Mail, PenLine } from "lucide-react";

function Sparkle({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 1.5L13.35 9.6L21 10.9L13.35 12.2L12 20.5L10.65 12.2L3 10.9L10.65 9.6L12 1.5Z"
        fill="#a78bfa"
      />
    </svg>
  );
}

/** Decorative header graphic — document, pen, and envelope with sparkles */
export function CoverLetterHeroIllustration() {
  return (
    <div className="relative hidden h-[110px] w-[220px] shrink-0 lg:block" aria-hidden>
      <div className="absolute right-0 top-0 h-20 w-16 rotate-[-8deg] rounded-xl border border-[#ede9fe] bg-white p-2.5 shadow-[0_12px_32px_rgba(139,92,246,0.15)]">
        <div className="mb-2 h-1.5 w-8 rounded-full bg-[#c4b5fd]" />
        <div className="space-y-1.5">
          <div className="h-1 w-full rounded-full bg-[#ede9fe]" />
          <div className="h-1 w-4/5 rounded-full bg-[#f3e8ff]" />
          <div className="h-1 w-full rounded-full bg-[#ede9fe]" />
          <div className="h-1 w-3/5 rounded-full bg-[#f3e8ff]" />
        </div>
        <FileText className="absolute bottom-2 right-2 h-3.5 w-3.5 text-[#a78bfa]" strokeWidth={2} />
      </div>

      <div className="absolute right-[72px] top-6 flex h-11 w-11 rotate-[18deg] items-center justify-center rounded-xl bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed] shadow-[0_8px_24px_rgba(139,92,246,0.35)]">
        <PenLine className="h-5 w-5 text-white" strokeWidth={2} />
      </div>

      <div className="absolute bottom-2 right-[100px] flex h-10 w-10 rotate-[-6deg] items-center justify-center rounded-xl border border-[#ddd6fe] bg-[#f5f3ff] shadow-md">
        <Mail className="h-5 w-5 text-[#8b5cf6]" strokeWidth={2} />
      </div>

      <Sparkle size={14} className="absolute right-[52px] top-1" />
      <Sparkle size={10} className="absolute right-2 top-14 opacity-70" />
      <Sparkle size={12} className="absolute bottom-6 right-[168px] opacity-80" />
    </div>
  );
}
