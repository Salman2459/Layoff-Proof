import { Linkedin, Mail, Send } from "lucide-react";

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

/** Decorative header graphic — messaging apps with paper plane */
export function OutreachHeroIllustration() {
  return (
    <div className="relative hidden h-[120px] w-[220px] shrink-0 lg:block" aria-hidden>
      <div className="absolute right-6 top-1 h-[88px] w-[130px] rotate-[-3deg] rounded-2xl border border-[#ede9fe] bg-white p-3 shadow-[0_12px_32px_rgba(139,92,246,0.15)]">
        <div className="mb-2 h-1.5 w-8 rounded-full bg-[#c4b5fd]" />
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#dbeafe]">
            <Linkedin className="h-4 w-4 text-[#2563eb]" strokeWidth={2} />
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#fee2e2]">
            <Mail className="h-4 w-4 text-[#ef4444]" strokeWidth={2} />
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ede9fe]">
            <Mail className="h-4 w-4 text-[#8b5cf6]" strokeWidth={2} />
          </div>
        </div>
        <div className="mt-2 space-y-1.5">
          <div className="h-1 w-full rounded-full bg-[#ede9fe]" />
          <div className="h-1 w-4/5 rounded-full bg-[#f3e8ff]" />
        </div>
      </div>

      <div className="absolute right-0 top-10 flex h-11 w-11 rotate-[12deg] items-center justify-center rounded-2xl bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed] shadow-[0_8px_24px_rgba(139,92,246,0.35)]">
        <Send className="h-5 w-5 text-white" strokeWidth={2} />
      </div>

      <div className="absolute right-[72px] top-6 flex h-9 w-9 items-center justify-center rounded-full bg-[#ede9fe] shadow-md">
        <Sparkle size={16} />
      </div>

      <Sparkle size={12} className="absolute right-2 top-2 opacity-80" />
      <Sparkle size={10} className="absolute bottom-6 right-[160px] opacity-70" />
    </div>
  );
}
