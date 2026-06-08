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

/** Decorative hero graphic — line chart and donut chart cards */
export function CareerPathHeroIllustration() {
  return (
    <div className="relative hidden h-[118px] w-[220px] shrink-0 sm:block" aria-hidden>
      {/* Line chart card */}
      <div className="absolute right-[88px] top-0 h-[72px] w-[108px] rounded-2xl bg-white p-2.5 shadow-[0_10px_28px_rgba(15,23,42,0.14)]">
        <div className="mb-1.5 h-1 w-8 rounded-full bg-[#ede9fe]" />
        <svg viewBox="0 0 88 36" className="h-9 w-full" preserveAspectRatio="none">
          <polyline
            points="0,30 18,22 34,26 52,12 70,16 88,6"
            fill="none"
            stroke="url(#careerLineGrad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <defs>
            <linearGradient id="careerLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Donut chart card */}
      <div className="absolute right-0 top-3 h-[88px] w-[118px] rounded-2xl bg-white p-2.5 shadow-[0_10px_28px_rgba(15,23,42,0.14)]">
        <div className="flex items-start gap-2">
          <svg viewBox="0 0 44 44" className="h-11 w-11 shrink-0">
            <defs>
              <linearGradient id="careerDonutGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f472b6" />
                <stop offset="50%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>
            <circle cx="22" cy="22" r="16" fill="none" stroke="#ede9fe" strokeWidth="7" />
            <circle
              cx="22"
              cy="22"
              r="16"
              fill="none"
              stroke="url(#careerDonutGrad)"
              strokeWidth="7"
              strokeDasharray="60 100"
              strokeLinecap="round"
              transform="rotate(-90 22 22)"
            />
          </svg>
          <div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-1">
                <div
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{
                    backgroundColor: ["#a855f7", "#ec4899", "#6366f1"][i],
                  }}
                />
                <div className="h-1 flex-1 rounded-full bg-[#e2e8f0]" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <Sparkle size={12} className="absolute right-[196px] top-2" />
      <Sparkle size={10} className="absolute right-4 top-0 opacity-90" />
      <Sparkle size={9} className="absolute bottom-6 right-[120px] opacity-80" />
    </div>
  );
}
