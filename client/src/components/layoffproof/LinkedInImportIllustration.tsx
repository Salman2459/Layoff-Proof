import { Briefcase, Check, CreditCard } from "lucide-react";

type SparkleStarProps = {
  size: number;
  color?: string;
  opacity?: number;
  className?: string;
};

/** Four-point filled sparkle matching the mockup */
function SparkleStar({
  size,
  color = "#9333ea",
  opacity = 1,
  className,
}: SparkleStarProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{ opacity }}
      aria-hidden
    >
      <path
        d="M12 1.5L13.35 9.6L21 10.9L13.35 12.2L12 20.5L10.65 12.2L3 10.9L10.65 9.6L12 1.5Z"
        fill={color}
      />
    </svg>
  );
}

function ProfileAvatar() {
  return (
    <svg viewBox="0 0 48 48" className="h-12 w-12" aria-hidden>
      <circle cx="24" cy="24" r="24" fill="#ede9fe" />
      <circle cx="24" cy="18" r="8" fill="#8b5cf6" />
      <path d="M10 42c2.5-8 7.5-12 14-12s11.5 4 14 12" fill="#8b5cf6" />
    </svg>
  );
}

export function LinkedInImportIllustration() {
  return (
    <div
      className="relative mx-auto h-[300px] w-full max-w-[340px] lg:mx-0"
      aria-hidden
    >
      {/* Soft gradient background */}
      <div className="absolute inset-2 rounded-[28px] bg-gradient-to-br from-white via-[#fdfcff] to-[#f3e8ff]/90" />
      <div className="absolute bottom-6 left-4 h-28 w-28 rounded-full bg-[#c4b5fd]/25 blur-3xl" />
      <div className="absolute right-2 top-10 h-20 w-20 rounded-full bg-[#ddd6fe]/40 blur-2xl" />

      {/* Card + floating badges wrapper */}
      <div className="absolute left-1/2 top-1/2 w-[250px] -translate-x-1/2 -translate-y-1/2">
        {/* Decorative sparkles — 3 stars like mockup */}
        <SparkleStar
          size={18}
          color="#9333ea"
          className="absolute left-2 -top-6 z-0"
        />
        <SparkleStar
          size={10}
          color="#c4b5fd"
          opacity={0.7}
          className="absolute left-[96px] -top-3 z-0"
        />
        <SparkleStar
          size={15}
          color="#9333ea"
          className="absolute right-6 -top-5 z-0"
        />
        {/* Main profile card */}
        <div className="relative rounded-[20px] border border-[#f1f5f9] bg-white p-4 shadow-[0_18px_48px_rgba(139,92,246,0.14)]">
          <div className="mb-3 flex h-[22px] w-[22px] items-center justify-center rounded-[4px] bg-[#0a66c2] text-[9px] font-bold leading-none text-white">
            in
          </div>

          <div className="flex items-center gap-3">
            <ProfileAvatar />
            <div className="min-w-0 flex-1 space-y-2.5">
              <div className="h-2 w-[68px] rounded-full bg-[#e9e0ff]" />
              <div className="h-2 w-full rounded-full bg-[#ede9fe]" />
              <div className="h-2 w-[92px] rounded-full bg-[#ede9fe]" />
            </div>
          </div>

          <div className="my-3.5 h-px bg-[#ede9fe]" />

          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-2.5">
              <div className="h-2 w-full rounded-full bg-[#ede9fe]" />
              <div className="h-2 w-[78%] rounded-full bg-[#f3e8ff]" />
            </div>
            <div className="space-y-2.5">
              <div className="h-2 w-full rounded-full bg-[#ede9fe]" />
              <div className="h-2 w-[70%] rounded-full bg-[#f3e8ff]" />
            </div>
          </div>
        </div>

        {/* Top-right check badge */}
        <div className="absolute -right-3 -top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-[#8b5cf6] shadow-[0_6px_18px_rgba(139,92,246,0.4)]">
          <Check className="h-4 w-4 text-white" strokeWidth={3} />
        </div>

        {/* Mid-left ID badge */}
        <div className="absolute -left-4 top-[46%] z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl bg-[#8b5cf6] shadow-[0_6px_18px_rgba(139,92,246,0.4)]">
          <CreditCard className="h-4 w-4 text-white" strokeWidth={2} />
        </div>

        {/* Bottom-right briefcase badge */}
        <div className="absolute -bottom-3 -right-2 z-10 flex h-9 w-9 items-center justify-center rounded-xl bg-[#8b5cf6] shadow-[0_6px_18px_rgba(139,92,246,0.4)]">
          <Briefcase className="h-4 w-4 text-white" strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}
