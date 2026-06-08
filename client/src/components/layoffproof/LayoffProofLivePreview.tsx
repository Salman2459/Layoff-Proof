import { Loader2, Monitor, RefreshCw, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

type LayoffProofLivePreviewProps = {
  previewHtml: string;
  isLoading?: boolean;
  viewMode: "desktop" | "mobile";
  onViewModeChange: (mode: "desktop" | "mobile") => void;
  onRefresh: () => void;
  hideHeader?: boolean;
  className?: string;
  frameClassName?: string;
};

export function LayoffProofLivePreview({
  previewHtml,
  isLoading,
  viewMode,
  onViewModeChange,
  onRefresh,
  hideHeader = false,
  className,
  frameClassName,
}: LayoffProofLivePreviewProps) {
  const toolbar = (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onViewModeChange("desktop")}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg border transition",
          viewMode === "desktop"
            ? "border-[#c7d2fe] bg-[#eef2ff] text-[#6366f1]"
            : "border-transparent text-[#94a3b8] hover:bg-[#f8fafc]",
        )}
        aria-label="Desktop preview"
      >
        <Monitor className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onViewModeChange("mobile")}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg border transition",
          viewMode === "mobile"
            ? "border-[#c7d2fe] bg-[#eef2ff] text-[#6366f1]"
            : "border-transparent text-[#94a3b8] hover:bg-[#f8fafc]",
        )}
        aria-label="Mobile preview"
      >
        <Smartphone className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onRefresh}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-[#94a3b8] transition hover:bg-[#f8fafc] hover:text-[#6366f1]"
        aria-label="Refresh preview"
      >
        <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
      </button>
    </div>
  );

  return (
    <div
      className={cn(
        "rounded-2xl border border-[#e8ecf4] bg-white p-5 shadow-sm",
        className,
      )}
    >
      {hideHeader ? (
        <div className="mb-4 flex justify-end">{toolbar}</div>
      ) : (
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[#0f172a]">Live Preview</h3>
            <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
              Real-time preview
            </span>
          </div>
          {toolbar}
        </div>
      )}

      <div className="rounded-xl border border-[#e2e8f0] bg-[#f1f5f9] p-3">
        <div
          className={cn(
            "relative mx-auto overflow-hidden rounded-lg bg-white shadow-md transition-all",
            viewMode === "mobile" ? "max-w-[280px]" : "w-full",
          )}
        >
          <div className={cn("relative min-h-[420px]", frameClassName)}>
            {previewHtml ? (
              <>
                <iframe
                  srcDoc={previewHtml}
                  className="h-[480px] w-full border-0"
                  title="Resume Preview"
                />
                {isLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/75 backdrop-blur-[1px]">
                    <Loader2 className="h-6 w-6 animate-spin text-[#6366f1]" />
                  </div>
                ) : null}
              </>
            ) : isLoading ? (
              <div className="flex h-[420px] items-center justify-center text-sm text-[#64748b]">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Loading preview…
              </div>
            ) : (
              <div className="flex h-[420px] items-center justify-center text-sm text-[#94a3b8]">
                Preview will appear here
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
