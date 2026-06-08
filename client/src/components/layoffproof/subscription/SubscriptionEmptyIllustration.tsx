import { FileText, X } from "lucide-react";

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

export function SubscriptionEmptyIllustration() {
  return (
    <div className="relative mx-auto mb-6 h-[100px] w-[100px]" aria-hidden>
      <div className="absolute inset-0 scale-[1.6] rounded-full bg-[#ede9fe]/70 blur-2xl" />
      <div className="relative flex h-[100px] w-[100px] items-center justify-center rounded-full bg-gradient-to-br from-[#ede9fe] to-[#ddd6fe] shadow-inner">
        <FileText className="h-11 w-11 text-[#8b5cf6]" strokeWidth={1.5} />
      </div>
      <div className="absolute -bottom-0.5 -right-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-[#8b5cf6] shadow-[0_4px_14px_rgba(139,92,246,0.4)]">
        <X className="h-4 w-4 text-white" strokeWidth={3} />
      </div>
      <Sparkle size={12} className="absolute -left-2 top-2" />
      <Sparkle size={8} className="absolute right-0 top-0 opacity-70" />
      <Sparkle size={10} className="absolute -bottom-2 left-4 opacity-80" />
    </div>
  );
}
