import type { LucideIcon } from "lucide-react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type AutoJobApplySectionTileProps = {
  icon: LucideIcon;
  label: string;
  done: boolean;
};

export function AutoJobApplySectionTile({
  icon: Icon,
  label,
  done,
}: AutoJobApplySectionTileProps) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-white p-4 shadow-sm transition hover:shadow-md",
        done ? "border-emerald-200/80" : "border-[#e8ecf4]"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg",
            done ? "bg-emerald-50 text-emerald-600" : "bg-[#f8fafc] text-[#64748b]"
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={2} />
        </div>
        {done ? (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" strokeWidth={2} />
        ) : (
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" strokeWidth={2} />
        )}
      </div>
      <p className="mt-3 text-[13px] font-semibold text-[#0f172a]">{label}</p>
      <p className="mt-0.5 text-[11px] text-[#94a3b8]">{done ? "Complete" : "Needs attention"}</p>
    </div>
  );
}
