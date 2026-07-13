import {
  Check,
  ChevronDown,
  Download,
  Eye,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type ResumeBuilderChromeProps = {
  isSaving?: boolean;
  onPreview?: () => void;
  onDownloadPdf?: () => void;
  onDownloadDoc?: () => void;
  onImportResume?: () => void;
  downloadPending?: boolean;
  className?: string;
};

export function ResumeBuilderChrome({
  isSaving = false,
  onPreview,
  onDownloadPdf,
  onDownloadDoc,
  onImportResume,
  downloadPending,
  className,
}: ResumeBuilderChromeProps) {
  return (
    <div
      className={cn(
        "border-b border-[#e8ecf4] bg-[#f4f6fb]/95 px-8 py-6 backdrop-blur-sm",
        className
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[#0f172a]">
            Resume Builder
          </h1>
          <p className="mt-1 text-sm text-[#64748b]">
            Create a professional resume that gets you hired ✨
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-xs font-medium text-[#64748b] shadow-sm">
            {isSaving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#6366f1]" />
                Saving…
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-500" strokeWidth={2.5} />
                All changes saved
              </>
            )}
          </div>

          {onImportResume ? (
            <Button
              type="button"
              variant="outline"
              onClick={onImportResume}
              className="h-10 rounded-lg border-[#e2e8f0] bg-white text-sm font-semibold text-[#334155] shadow-sm hover:bg-[#f8fafc]"
            >
              Update Resume
            </Button>
          ) : null}

          <Button
            type="button"
            variant="outline"
            onClick={onPreview}
            className="h-10 rounded-lg border-[#e2e8f0] bg-white text-sm font-semibold text-[#334155] shadow-sm hover:bg-[#f8fafc]"
          >
            <Eye className="mr-2 h-4 w-4" />
            Preview Resume
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                disabled={downloadPending}
                className="h-10 rounded-lg bg-[#6366f1] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#4f46e5]"
              >
                {downloadPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Download Resume
                <ChevronDown className="ml-2 h-4 w-4 opacity-80" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={onDownloadPdf}>Download PDF</DropdownMenuItem>
              {onDownloadDoc ? (
                <DropdownMenuItem onClick={onDownloadDoc}>Download Word</DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
