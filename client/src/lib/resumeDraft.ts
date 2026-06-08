const DRAFT_PREFIX = "layoffproof:resume-draft:";

export type ResumeDraftEnvelope = {
  data: Record<string, unknown>;
  selectedTemplate?: string;
  selectedCatalogId?: string;
  savedAt: number;
};

export function loadResumeDraft(userId: string): ResumeDraftEnvelope | null {
  try {
    const raw = localStorage.getItem(`${DRAFT_PREFIX}${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ResumeDraftEnvelope;
    if (!parsed?.data || typeof parsed.data !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveResumeDraft(
  userId: string,
  data: Record<string, unknown>,
  options?: { selectedTemplate?: string; selectedCatalogId?: string },
): void {
  try {
    const envelope: ResumeDraftEnvelope = {
      data,
      selectedTemplate: options?.selectedTemplate,
      selectedCatalogId: options?.selectedCatalogId,
      savedAt: Date.now(),
    };
    localStorage.setItem(`${DRAFT_PREFIX}${userId}`, JSON.stringify(envelope));
  } catch {
    // Quota exceeded (e.g. very large photo) — draft save is best-effort
  }
}

export function clearResumeDraft(userId: string): void {
  try {
    localStorage.removeItem(`${DRAFT_PREFIX}${userId}`);
  } catch {
    // ignore
  }
}
