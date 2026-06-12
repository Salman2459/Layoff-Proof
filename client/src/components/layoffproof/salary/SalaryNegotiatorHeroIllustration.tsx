import { DollarSign, TrendingUp } from "lucide-react";

function Sparkle({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 1.5L13.35 9.6L21 10.9L13.35 12.2L12 20.5L10.65 12.2L3 10.9L10.65 9.6L12 1.5Z"
        fill="white"
      />
    </svg>
  );
}

/** Decorative hero graphic — salary chart & offer card */
export function SalaryNegotiatorHeroIllustration() {
  return (
    <div className="relative hidden h-[118px] w-[230px] shrink-0 sm:block" aria-hidden>
      <div className="absolute right-8 top-0 h-[92px] w-[168px] rounded-2xl bg-white p-3 shadow-[0_10px_28px_rgba(15,23,42,0.14)]">
        <div className="mb-2 flex items-center justify-between">
          <div className="h-1 w-9 rounded-full bg-gradient-to-r from-[#c4b5fd] to-[#a855f7]" />
          <span className="rounded-full bg-[#f5f3ff] px-2 py-0.5 text-[8px] font-bold text-[#7c3aed]">
            +18%
          </span>
        </div>
        <div className="flex items-end justify-between gap-2 px-1">
          {[38, 52, 44, 68].map((h, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full max-w-[22px] rounded-md bg-gradient-to-t from-[#7c3aed] to-[#c084fc]"
                style={{ height: `${h}px` }}
              />
              <div className="h-1 w-full rounded-full bg-[#f1f5f9]" />
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-2 right-[152px] flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-[0_6px_16px_rgba(15,23,42,0.12)]">
        <DollarSign className="h-5 w-5 text-[#7c3aed]" strokeWidth={2.25} />
      </div>

      <div className="absolute bottom-0 right-0 flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-[0_6px_16px_rgba(15,23,42,0.12)]">
        <TrendingUp className="h-5 w-5 text-[#a855f7]" strokeWidth={2.25} />
      </div>

      <Sparkle size={13} className="absolute right-[188px] top-1 opacity-95" />
      <Sparkle size={10} className="absolute right-5 top-7 opacity-90" />
      <Sparkle size={11} className="absolute bottom-9 right-[104px] opacity-80" />
    </div>
  );
}
