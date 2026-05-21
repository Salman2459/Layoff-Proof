/**
 * Inline SVG paths match react-icons:
 * - SiLinkedin, SiGithub (Simple Icons)
 * - MdLocationOn (Material Design)
 * Used in server PDF HTML and client iframe preview where React components cannot run.
 */

const SI_LINKEDIN_PATH =
  "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z";

const SI_GITHUB_PATH =
  "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12";

/** MdLocationOn (react-icons/md) */
const MD_LOCATION_ON_PATH =
  "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z";

export type ResumeSocialKind = "linkedin" | "github";

export function resumeSocialSvg(
  kind: ResumeSocialKind,
  opts?: { size?: number; fill?: string; className?: string },
): string {
  const size = opts?.size ?? 16;
  const fill = opts?.fill ?? "currentColor";
  const cls = opts?.className ? ` class="${opts.className}"` : "";
  const d = kind === "linkedin" ? SI_LINKEDIN_PATH : SI_GITHUB_PATH;
  const label = kind === "linkedin" ? "LinkedIn" : "GitHub";
  return `<svg${cls} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${label}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}"><path d="${d}"/></svg>`;
}

export function resumeLocationSvg(opts?: {
  size?: number;
  fill?: string;
  className?: string;
}): string {
  const size = opts?.size ?? 16;
  const fill = opts?.fill ?? "currentColor";
  const cls = opts?.className ? ` class="${opts.className}"` : "";
  return `<svg${cls} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Location" width="${size}" height="${size}" viewBox="0 0 24 24"><path fill="${fill}" d="${MD_LOCATION_ON_PATH}"/></svg>`;
}

/** Absolute URL for PDF/print link targets. */
export function normalizeLinkedInHref(raw: unknown): string {
  const t = String(raw ?? "").trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  if (/linkedin\.com/i.test(t)) return `https://${t.replace(/^\/+/, "")}`;
  const slug = t.replace(/^@/, "").replace(/^\/*/, "").replace(/\/*$/, "");
  return slug ? `https://www.linkedin.com/in/${slug}` : "";
}

/** Visible LinkedIn URL without protocol (e.g. www.linkedin.com/in/handle). */
export function linkedInDisplayUrl(raw: unknown): string {
  const href = normalizeLinkedInHref(raw);
  if (!href) return "";
  return href.replace(/^https?:\/\//i, "");
}

export type LinkedInPdfLinkOpts = {
  esc?: (s: string) => string;
  iconSize?: number;
  iconFill?: string;
  linkColor?: string;
  /** Photo Classic contact band: icon in .icon cell */
  bandLayout?: boolean;
  /** Brand Split hero pills */
  pillLayout?: boolean;
};

/** Icon + full profile URL as a clickable anchor for resume PDF HTML. */
export function linkedInPdfLinkHtml(
  raw: unknown,
  opts: LinkedInPdfLinkOpts = {},
): string {
  const href = normalizeLinkedInHref(raw);
  if (!href) return "";
  const display = linkedInDisplayUrl(raw);
  const e = opts.esc ?? ((s: string) => s);
  const icon = resumeSocialSvg("linkedin", {
    size: opts.iconSize ?? 16,
    fill: opts.iconFill ?? "#0A66C2",
  });
  const color = opts.linkColor ?? "#2563eb";
  const link = `<a href="${e(href)}" target="_blank" rel="noopener noreferrer" style="color:${color};text-decoration:underline;word-break:break-all;">${e(display)}</a>`;

  if (opts.bandLayout) {
    return `<span style="display:inline-flex;align-items:center;gap:8px;min-width:0;"><span class="icon">${icon}</span><span style="min-width:0;">${link}</span></span>`;
  }
  if (opts.pillLayout) {
    return `<span class="pill" style="display:inline-flex;align-items:center;gap:6px;min-width:0;">${icon}${link}</span>`;
  }
  return `<span style="display:inline-flex;align-items:center;gap:5px;flex-wrap:wrap;">${icon}${link}</span>`;
}
