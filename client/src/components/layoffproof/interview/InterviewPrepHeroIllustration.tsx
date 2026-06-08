import { Bot, Check } from "lucide-react";

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

/** Decorative header graphic — checklist card with AI robot */
export function InterviewPrepHeroIllustration() {
  return (
    <div className="relative hidden h-[120px] w-[200px] shrink-0 lg:block" aria-hidden>
      <div className="absolute right-4 top-2 h-[88px] w-[120px] rotate-[-4deg] rounded-2xl border border-[#ede9fe] bg-white p-3 shadow-[0_12px_32px_rgba(139,92,246,0.15)]">
        <div className="mb-2 h-1.5 w-10 rounded-full bg-[#c4b5fd]" />
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#ede9fe]">
                <Check className="h-2.5 w-2.5 text-[#8b5cf6]" strokeWidth={3} />
              </div>
              <div
                className="h-1 rounded-full bg-[#f3e8ff]"
                style={{ width: `${72 - i * 8}%` }}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="absolute right-0 top-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed] shadow-[0_8px_24px_rgba(139,92,246,0.35)]">
        <Bot className="h-6 w-6 text-white" strokeWidth={2} />
      </div>

      <Sparkle size={14} className="absolute right-[88px] top-0" />
      <Sparkle size={10} className="absolute right-2 top-20 opacity-70" />
      <Sparkle size={12} className="absolute bottom-4 right-[140px] opacity-80" />
    </div>
  );
}
