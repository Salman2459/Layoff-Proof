/** Backend `generateResumeHTML` template ids that render a profile photo. */
export const RESUME_TEMPLATES_WITH_PHOTO = new Set([
  "emerald-sidebar",
  "photo-classic",
  "brand-split",
]);

/** Templates that include a Projects section (keep in sync with server). */
export const RESUME_TEMPLATES_WITH_PROJECTS = new Set([
  "photo-classic",
  "brand-split",
]);

export function templateSupportsProfilePhoto(templateId: string): boolean {
  return RESUME_TEMPLATES_WITH_PHOTO.has(templateId);
}

export function templateSupportsProjects(templateId: string): boolean {
  return RESUME_TEMPLATES_WITH_PROJECTS.has(templateId);
}

/** Human-readable names shown in the resume builder UI. */
export const RESUME_PHOTO_TEMPLATE_NAMES =
  "Modern Professional, Executive, Elegant, and Classic Professional";

export function getResumeProfileImageSrc(data: {
  profileImageDataUrl?: string | null;
  profileImageUrl?: string | null;
}): string {
  const dataUrl = (data.profileImageDataUrl ?? "").trim();
  if (dataUrl) return dataUrl;
  return (data.profileImageUrl ?? "").trim();
}
