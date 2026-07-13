const DRAFT_PREFIX = "layoffproof:cover-letter-draft:";

export type CoverLetterDraftEnvelope = {
  generatedLetter: string;
  jobDetails: {
    position: string;
    company: string;
    reason: string;
  };
  personalData: Record<string, string>;
  parsedResumeData: Record<string, string> | null;
  activeTab: "upload" | "manual";
  improvementInstructions?: string;
  savedAt: number;
};

export function loadCoverLetterDraft(
  userId: string,
): CoverLetterDraftEnvelope | null {
  try {
    const raw = localStorage.getItem(`${DRAFT_PREFIX}${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CoverLetterDraftEnvelope;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveCoverLetterDraft(
  userId: string,
  draft: Omit<CoverLetterDraftEnvelope, "savedAt">,
): void {
  try {
    const envelope: CoverLetterDraftEnvelope = {
      ...draft,
      savedAt: Date.now(),
    };
    localStorage.setItem(`${DRAFT_PREFIX}${userId}`, JSON.stringify(envelope));
  } catch {
    // Quota exceeded — draft save is best-effort
  }
}

export function clearCoverLetterDraft(userId: string): void {
  try {
    localStorage.removeItem(`${DRAFT_PREFIX}${userId}`);
  } catch {
    // ignore
  }
}
