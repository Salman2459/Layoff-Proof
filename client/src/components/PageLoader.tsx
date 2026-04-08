import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type PageLoaderProps = {
  /** Full-screen overlay while a route chunk loads */
  overlay?: boolean;
  className?: string;
};

export function PageLoader({ overlay = false, className }: PageLoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading"
      className={cn(
        "flex items-center justify-center lp-page-mesh",
        overlay ? "fixed inset-0 z-[100]" : "min-h-screen w-full",
        className
      )}
    >
      <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
    </div>
  );
}
