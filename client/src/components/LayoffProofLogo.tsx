import { cn } from "@/lib/utils";

type LayoffProofLogoProps = {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  showText?: boolean;
};

export function LayoffProofLogo({
  className,
  iconClassName = "h-9 w-9 text-sm",
  textClassName = "text-[17px] font-bold tracking-tight",
  showText = true,
}: LayoffProofLogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg lp-gradient-fill font-bold text-primary-foreground shadow-sm",
          iconClassName
        )}
      >
        LP
      </div>
      {showText && (
        <span className={cn("lp-gradient-text", textClassName)}>Layoff Proof</span>
      )}
    </div>
  );
}
