import { useState } from "react";
import { Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { LAYOFFPROOF_TEMPLATE_STRIP } from "./layoffproof-template-catalog";
import { ResumeTemplatePreviewArt } from "./ResumeTemplatePreviewArt";
import { LayoffProofTemplateGallery } from "./LayoffProofTemplateGallery";

const STRIP_SHORT_LABELS = ["Modern", "Minimal", "Creative", "Professional", "Executive"];

type LayoffProofTemplateStripProps = {
  selectedTemplateId: string;
  selectedCatalogId?: string;
  onSelect: (serverTemplateId: string, catalogId?: string) => void;
};

export function LayoffProofTemplateStrip({
  selectedTemplateId,
  selectedCatalogId,
  onSelect,
}: LayoffProofTemplateStripProps) {
  const [galleryOpen, setGalleryOpen] = useState(false);

  const handleGallerySelect = (serverId: string, catalogId: string) => {
    onSelect(serverId, catalogId);
    setGalleryOpen(false);
  };

  return (
    <>
      <div className="rounded-2xl border border-[#e8ecf4] bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[15px] font-bold text-[#0f172a]">Choose Template</h3>
          <button
            type="button"
            onClick={() => setGalleryOpen(true)}
            className="text-xs font-semibold text-[#6366f1] transition hover:text-[#4f46e5]"
          >
            View All
          </button>
        </div>

        <div className="grid grid-cols-5 gap-3">
          {LAYOFFPROOF_TEMPLATE_STRIP.map((t, index) => {
            const selected =
              selectedCatalogId === t.catalogId ||
              (!selectedCatalogId && selectedTemplateId === t.serverTemplateId);
            const label = STRIP_SHORT_LABELS[index] ?? t.catalog.name;
            return (
              <button
                key={t.catalogId}
                type="button"
                onClick={() => onSelect(t.serverTemplateId, t.catalogId)}
                className="group min-w-0 text-left"
              >
                <div
                  className={cn(
                    "relative aspect-[3/4] w-full overflow-hidden rounded-xl border-2 bg-white shadow-sm transition-all",
                    selected
                      ? "border-[#6366f1] shadow-md shadow-indigo-100/80 ring-1 ring-[#6366f1]/20"
                      : "border-[#e8ecf4] hover:border-[#c7d2fe] hover:shadow"
                  )}
                >
                  <ResumeTemplatePreviewArt
                    variant={t.catalog.previewVariant}
                    className="h-full"
                  />
                  {selected ? (
                    <span className="absolute right-1.5 top-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#6366f1] text-white shadow-sm">
                      <Check className="h-2.5 w-2.5" strokeWidth={3} />
                    </span>
                  ) : null}
                </div>
                <p
                  className={cn(
                    "mt-2 text-center text-[11px] font-medium transition-colors",
                    selected ? "font-semibold text-[#6366f1]" : "text-[#64748b]"
                  )}
                >
                  {label}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto bg-[#f4f6fb] p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0f172a]">
              All Resume Templates
            </DialogTitle>
          </DialogHeader>
          <p className="-mt-2 mb-4 text-sm text-[#64748b]">
            Pick a layout — previews show sample styling; your content fills in on
            the right.
          </p>
          <LayoffProofTemplateGallery
            selectedCatalogId={selectedCatalogId}
            selectedServerTemplateId={selectedTemplateId}
            onSelect={handleGallerySelect}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
