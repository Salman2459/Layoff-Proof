import type { LinkedInProfileData } from "@/components/layoffproof/linkedin/LinkedInProfileEditor";
import type { AnalysisReportPayload } from "@/lib/linkedinOptimizer";

const DRAFT_PREFIX = "layoffproof:linkedin-optimizer-draft:";

export type LinkedInOptimizerDraftEnvelope = {
  profileData: LinkedInProfileData;
  analysisReport: AnalysisReportPayload | null;
  targetJobTitle: string;
  linkedinUrl: string;
  savedAt: number;
};

export function loadLinkedInOptimizerDraft(
  userId: string,
): LinkedInOptimizerDraftEnvelope | null {
  try {
    const raw = localStorage.getItem(`${DRAFT_PREFIX}${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LinkedInOptimizerDraftEnvelope;
    if (!parsed?.profileData || typeof parsed.profileData !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveLinkedInOptimizerDraft(
  userId: string,
  draft: Omit<LinkedInOptimizerDraftEnvelope, "savedAt">,
): void {
  try {
    const envelope: LinkedInOptimizerDraftEnvelope = {
      ...draft,
      savedAt: Date.now(),
    };
    localStorage.setItem(`${DRAFT_PREFIX}${userId}`, JSON.stringify(envelope));
  } catch {
    // Quota exceeded — draft save is best-effort
  }
}

export function clearLinkedInOptimizerDraft(userId: string): void {
  try {
    localStorage.removeItem(`${DRAFT_PREFIX}${userId}`);
  } catch {
    // ignore
  }
}
