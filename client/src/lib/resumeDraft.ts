const DRAFT_PREFIX = "layoffproof:resume-draft:";

export type ResumeBuilderStep =
  | "select"
  | "upload"
  | "linkedin-url"
  | "manual-edit"
  | "templates"
  | "editor-preview";

export type ResumeDraftEnvelope = {
  data: Record<string, unknown>;
  selectedTemplate?: string;
  selectedCatalogId?: string;
  currentStep?: ResumeBuilderStep;
  buildMethod?: "upload" | "linkedin" | "manual" | null;
  linkedinUrl?: string;
  editorSection?: string;
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
  options?: {
    selectedTemplate?: string;
    selectedCatalogId?: string;
    currentStep?: ResumeBuilderStep;
    buildMethod?: "upload" | "linkedin" | "manual" | null;
    linkedinUrl?: string;
    editorSection?: string;
  },
): void {
  try {
    const envelope: ResumeDraftEnvelope = {
      data,
      selectedTemplate: options?.selectedTemplate,
      selectedCatalogId: options?.selectedCatalogId,
      currentStep: options?.currentStep,
      buildMethod: options?.buildMethod,
      linkedinUrl: options?.linkedinUrl,
      editorSection: options?.editorSection,
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

/** True when the draft has real resume content worth restoring / keeping. */
export function resumeDraftHasContent(data: Record<string, unknown> | null | undefined): boolean {
  if (!data || typeof data !== "object") return false;
  const name = String(data.name ?? "").trim();
  const profession = String(data.profession ?? "").trim();
  const summary = String(data.summary ?? "").trim();
  const email = String(data.email ?? "").trim();
  const experience = Array.isArray(data.experience) ? data.experience : [];
  const education = Array.isArray(data.education) ? data.education : [];
  const skills = Array.isArray(data.skills) ? data.skills : [];
  return (
    !!name ||
    !!profession ||
    !!summary ||
    !!email ||
    experience.length > 0 ||
    education.length > 0 ||
    skills.length > 0
  );
}
