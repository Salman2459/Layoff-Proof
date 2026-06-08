import type { LucideIcon } from "lucide-react";

type OutreachMessageEmptyProps = {
  icon: LucideIcon;
  label: string;
};

export function OutreachMessageEmpty({ icon: Icon, label }: OutreachMessageEmptyProps) {
  return (
    <div className="flex min-h-[380px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#ddd6fe] bg-[#faf5ff]/60 px-6 py-12 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#ede9fe]/80">
        <Icon className="h-8 w-8 text-[#c4b5fd]" strokeWidth={1.5} />
      </div>
      <p className="text-sm font-semibold text-[#0f172a]">Your personalized message will appear here</p>
      <p className="mt-2 max-w-[260px] text-xs leading-relaxed text-[#64748b]">
        Fill in the details and click generate to create your {label}.
      </p>
    </div>
  );
}
