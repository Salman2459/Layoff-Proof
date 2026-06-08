import { BarChart3, Crown } from "lucide-react";

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

export function SubscribeHeroIllustration() {
  return (
    <div className="relative hidden h-[120px] w-[200px] shrink-0 lg:block" aria-hidden>
      <div className="absolute right-4 top-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed] shadow-[0_10px_28px_rgba(139,92,246,0.35)]">
        <Crown className="h-7 w-7 text-amber-300" fill="currentColor" strokeWidth={1.5} />
      </div>
      <div className="absolute bottom-2 right-16 w-[100px] rounded-xl border border-[#ede9fe] bg-white p-3 shadow-md">
        <div className="mb-2 flex items-end justify-between gap-1">
          {[35, 55, 40, 70, 48].map((h, i) => (
            <div
              key={i}
              className="w-3 rounded-t bg-gradient-to-t from-[#8b5cf6] to-[#c4b5fd]"
              style={{ height: `${h * 0.28}px` }}
            />
          ))}
        </div>
        <BarChart3 className="h-3.5 w-3.5 text-[#8b5cf6]" />
      </div>
      <Sparkle size={12} className="absolute right-0 top-6" />
      <Sparkle size={8} className="absolute right-20 top-0 opacity-70" />
      <Sparkle size={10} className="absolute bottom-8 right-2 opacity-80" />
    </div>
  );
}
