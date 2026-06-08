import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LayoffProofLivePreview } from "@/components/layoffproof/LayoffProofLivePreview";

type ResumePreviewModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previewHtml: string;
  isLoading?: boolean;
  viewMode: "desktop" | "mobile";
  onViewModeChange: (mode: "desktop" | "mobile") => void;
  onRefresh: () => void;
};

export function ResumePreviewModal({
  open,
  onOpenChange,
  previewHtml,
  isLoading,
  viewMode,
  onViewModeChange,
  onRefresh,
}: ResumePreviewModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-[95vw] max-w-5xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-[#e8ecf4] px-6 py-4">
          <DialogTitle className="text-left text-lg font-bold text-[#0f172a]">
            Resume Preview
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto p-4 sm:p-6">
          <LayoffProofLivePreview
            previewHtml={previewHtml}
            isLoading={isLoading}
            viewMode={viewMode}
            onViewModeChange={onViewModeChange}
            onRefresh={onRefresh}
            hideHeader
            className="border-0 p-0 shadow-none"
            frameClassName="min-h-[520px]"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
