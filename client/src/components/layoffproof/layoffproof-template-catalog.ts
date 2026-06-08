export type TemplateTagVariant = "popular" | "new" | "category";

export type TemplatePreviewVariant =
  | "modern-professional"
  | "minimal-clean"
  | "creative-sidebar"
  | "classic-professional"
  | "executive"
  | "elegant"
  | "two-column"
  | "techie"
  | "academic"
  | "minimalist";

export type LayoffProofTemplateCatalogItem = {
  /** Unique catalog key */
  id: string;
  /** Backend `generateResumeHTML` template id */
  serverTemplateId: string;
  name: string;
  previewVariant: TemplatePreviewVariant;
  tags: { label: string; variant: TemplateTagVariant }[];
  starred?: boolean;
};

export const LAYOFFPROOF_TEMPLATE_CATALOG: LayoffProofTemplateCatalogItem[] = [
  {
    id: "modern-professional",
    serverTemplateId: "emerald-sidebar",
    name: "Modern Professional",
    previewVariant: "modern-professional",
    tags: [
      { label: "Popular", variant: "popular" },
      { label: "Professional", variant: "category" },
    ],
    starred: true,
  },
  {
    id: "minimal-clean",
    serverTemplateId: "harvard",
    name: "Minimal Clean",
    previewVariant: "minimal-clean",
    tags: [
      { label: "Popular", variant: "popular" },
      { label: "Minimal", variant: "category" },
    ],
    starred: true,
  },
  {
    id: "creative-sidebar",
    serverTemplateId: "creative",
    name: "Creative Sidebar",
    previewVariant: "creative-sidebar",
    tags: [
      { label: "Popular", variant: "popular" },
      { label: "Creative", variant: "category" },
    ],
    starred: true,
  },
  {
    id: "classic-professional",
    serverTemplateId: "brand-split",
    name: "Classic Professional",
    previewVariant: "classic-professional",
    tags: [{ label: "Professional", variant: "category" }],
  },
  {
    id: "executive",
    serverTemplateId: "photo-classic",
    name: "Executive",
    previewVariant: "executive",
    tags: [
      { label: "New", variant: "new" },
      { label: "Executive", variant: "category" },
    ],
  },
  {
    id: "elegant",
    serverTemplateId: "photo-classic",
    name: "Elegant",
    previewVariant: "elegant",
    tags: [{ label: "Modern", variant: "category" }],
  },
  {
    id: "two-column",
    serverTemplateId: "creative",
    name: "Two Column",
    previewVariant: "two-column",
    tags: [{ label: "Professional", variant: "category" }],
  },
  {
    id: "techie",
    serverTemplateId: "techie",
    name: "Techie",
    previewVariant: "techie",
    tags: [
      { label: "New", variant: "new" },
      { label: "Creative", variant: "category" },
    ],
  },
  {
    id: "academic",
    serverTemplateId: "harvard",
    name: "Academic",
    previewVariant: "academic",
    tags: [{ label: "Academic", variant: "category" }],
  },
  {
    id: "minimalist",
    serverTemplateId: "professional",
    name: "Minimalist",
    previewVariant: "minimalist",
    tags: [
      { label: "New", variant: "new" },
      { label: "Minimal", variant: "category" },
    ],
  },
];

/** Quick-picker strip (first five in catalog order). */
export const LAYOFFPROOF_TEMPLATE_STRIP = LAYOFFPROOF_TEMPLATE_CATALOG.slice(0, 5).map(
  (t) => ({
    serverTemplateId: t.serverTemplateId,
    catalogId: t.id,
    catalog: t,
  })
);

export function catalogItemByServerId(
  serverTemplateId: string
): LayoffProofTemplateCatalogItem | undefined {
  return LAYOFFPROOF_TEMPLATE_CATALOG.find((t) => t.serverTemplateId === serverTemplateId);
}

export function catalogItemById(id: string): LayoffProofTemplateCatalogItem | undefined {
  return LAYOFFPROOF_TEMPLATE_CATALOG.find((t) => t.id === id);
}
