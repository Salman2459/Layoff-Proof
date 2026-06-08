import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const layoffProofSelectClass =
  "w-full appearance-none rounded-xl border border-[#e2e8f0] bg-white px-3 py-2.5 pr-9 text-sm text-[#0f172a] outline-none transition focus:border-[#a5b4fc] focus:ring-2 focus:ring-[#c7d2fe]/60 disabled:opacity-60";

type LayoffProofSelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  leftIcon?: React.ReactNode;
};

export function LayoffProofSelect({ className, children, leftIcon, ...props }: LayoffProofSelectProps) {
  return (
    <div className="relative">
      {leftIcon ? (
        <div className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[#94a3b8]">
          {leftIcon}
        </div>
      ) : null}
      <select className={cn(layoffProofSelectClass, leftIcon && "pl-9", className)} {...props}>
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]"
        aria-hidden
      />
    </div>
  );
}
