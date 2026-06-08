import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LAYOFFPROOF_TEMPLATE_CATALOG,
  type LayoffProofTemplateCatalogItem,
} from "./layoffproof-template-catalog";
import { ResumeTemplatePreviewArt } from "./ResumeTemplatePreviewArt";

function TemplateTag({
  label,
  variant,
}: {
  label: string;
  variant: "popular" | "new" | "category";
}) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
        variant === "popular" && "bg-emerald-50 text-emerald-700",
        variant === "new" && "bg-emerald-50 text-emerald-600",
        variant === "category" && "bg-[#eef2ff] text-[#6366f1]"
      )}
    >
      {label}
    </span>
  );
}

type TemplateCardProps = {
  item: LayoffProofTemplateCatalogItem;
  selected: boolean;
  starred: boolean;
  onSelect: () => void;
  onToggleStar: () => void;
};

function TemplateCard({
  item,
  selected,
  starred,
  onSelect,
  onToggleStar,
}: TemplateCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group w-full overflow-hidden rounded-xl border bg-white text-left shadow-sm transition-all hover:shadow-md",
        selected
          ? "border-[#6366f1] ring-2 ring-[#6366f1]/30"
          : "border-[#e8ecf4] hover:border-[#c7d2fe]"
      )}
    >
      <div className="aspect-[3/4] w-full overflow-hidden bg-[#f8fafc] p-2">
        <div className="h-full overflow-hidden rounded-md border border-[#e2e8f0] bg-white shadow-inner">
          <ResumeTemplatePreviewArt variant={item.previewVariant} className="h-full" />
        </div>
      </div>
      <div className="flex items-start justify-between gap-2 border-t border-[#f1f5f9] px-3 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-[#0f172a]">{item.name}</p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {item.tags.map((tag) => (
              <TemplateTag key={tag.label} label={tag.label} variant={tag.variant} />
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleStar();
          }}
          className="shrink-0 rounded p-0.5 text-[#cbd5e1] transition hover:text-amber-400"
          aria-label={starred ? "Unfavorite template" : "Favorite template"}
        >
          <Star
            className={cn("h-4 w-4", starred && "fill-amber-400 text-amber-400")}
            strokeWidth={starred ? 0 : 1.75}
          />
        </button>
      </div>
    </button>
  );
}

type LayoffProofTemplateGalleryProps = {
  selectedServerTemplateId: string;
  selectedCatalogId?: string;
  onSelect: (serverTemplateId: string, catalogId: string) => void;
  className?: string;
};

export function LayoffProofTemplateGallery({
  selectedServerTemplateId,
  selectedCatalogId,
  onSelect,
  className,
}: LayoffProofTemplateGalleryProps) {
  const [starred, setStarred] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      LAYOFFPROOF_TEMPLATE_CATALOG.filter((t) => t.starred).map((t) => [t.id, true])
    )
  );

  const resolvedCatalogId =
    selectedCatalogId ??
    LAYOFFPROOF_TEMPLATE_CATALOG.find(
      (t) => t.serverTemplateId === selectedServerTemplateId
    )?.id;

  return (
    <div className={cn("grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5", className)}>
      {LAYOFFPROOF_TEMPLATE_CATALOG.map((item) => (
        <TemplateCard
          key={item.id}
          item={item}
          selected={item.id === resolvedCatalogId}
          starred={!!starred[item.id]}
          onSelect={() => onSelect(item.serverTemplateId, item.id)}
          onToggleStar={() =>
            setStarred((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
          }
        />
      ))}
    </div>
  );
}
