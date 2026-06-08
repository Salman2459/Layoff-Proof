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
        "flex items-center justify-center layoffproof-page-loader",
        overlay ? "fixed inset-0 z-[100]" : "min-h-screen w-full",
        className,
      )}
    >
      <div className="layoffproof-loader-ring" aria-hidden />
      <span className="sr-only">Loading</span>
    </div>
  );
}
