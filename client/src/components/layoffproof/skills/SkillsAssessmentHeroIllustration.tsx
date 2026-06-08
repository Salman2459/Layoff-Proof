import { Award, Check } from "lucide-react";

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

/** Decorative hero graphic — white dashboard with donut chart, checklist, medal & bar chart */
export function SkillsAssessmentHeroIllustration() {
  return (
    <div className="relative hidden h-[118px] w-[230px] shrink-0 sm:block" aria-hidden>
      {/* Main dashboard window */}
      <div className="absolute right-10 top-0 h-[90px] w-[162px] rounded-2xl bg-white p-3 shadow-[0_10px_28px_rgba(15,23,42,0.14)]">
        <div className="mb-2 h-1 w-9 rounded-full bg-gradient-to-r from-[#c4b5fd] to-[#a78bfa]" />

        <div className="flex items-start gap-2.5">
          <svg viewBox="0 0 52 52" className="h-[52px] w-[52px] shrink-0" aria-hidden>
            <defs>
              <linearGradient id="skillsDonutGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f472b6" />
                <stop offset="45%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>
            <circle cx="26" cy="26" r="19" fill="none" stroke="#ede9fe" strokeWidth="9" />
            <circle
              cx="26"
              cy="26"
              r="19"
              fill="none"
              stroke="url(#skillsDonutGrad)"
              strokeWidth="9"
              strokeDasharray="72 119"
              strokeLinecap="round"
              transform="rotate(-90 26 26)"
            />
          </svg>

          <div className="min-w-0 flex-1 space-y-2 pt-1">
            {[100, 82, 90].map((width, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#8b5cf6]">
                  <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                </div>
                <div
                  className="h-1.5 rounded-full bg-[#e2e8f0]"
                  style={{ width: `${width}%` }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Medal card — bottom-left overlap */}
      <div className="absolute bottom-3 right-[148px] flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-[0_6px_16px_rgba(15,23,42,0.12)]">
        <Award className="h-5 w-5 text-[#8b5cf6]" strokeWidth={2} />
      </div>

      {/* Bar chart card — bottom-right overlap */}
      <div className="absolute bottom-1 right-0 flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-[0_6px_16px_rgba(15,23,42,0.12)]">
        <div className="flex items-end gap-[3px]">
          {[10, 16, 22].map((h, i) => (
            <div
              key={i}
              className="w-[5px] rounded-sm bg-gradient-to-t from-[#7c3aed] to-[#c084fc]"
              style={{ height: `${h}px` }}
            />
          ))}
        </div>
      </div>

      <Sparkle size={13} className="absolute right-[188px] top-1 opacity-95" />
      <Sparkle size={10} className="absolute right-6 top-8 opacity-90" />
      <Sparkle size={11} className="absolute bottom-10 right-[108px] opacity-80" />
      <Sparkle size={9} className="absolute right-0 top-2 opacity-75" />
    </div>
  );
}
