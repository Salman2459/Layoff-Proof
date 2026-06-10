export const LINKEDIN_PROFILE_PREFIX = "https://www.linkedin.com/in/";

const VANITY_SLUG_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9_-]*[a-zA-Z0-9])?$/;
const LINKEDIN_PROFILE_URL_REGEX =
  /^https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9]([a-zA-Z0-9_-]*[a-zA-Z0-9])?\/?$/i;

/** Extract the /in/ vanity slug from a full URL, pasted input, or plain handle. */
export function linkedInVanityFromStored(stored: string): string {
  const t = (stored || "").trim();
  if (!t) return "";
  const fromPath = t.match(/linkedin\.com\/in\/([^/?#\s]+)/i);
  if (fromPath) return decodeURIComponent(fromPath[1]);
  if (!/^https?:\/\//i.test(t)) {
    return t.replace(/^@/, "").replace(/^\/*/, "").replace(/\/*$/, "");
  }
  return "";
}

/** Build stored `linkedin` field from what the user types in the profile slug box. */
export function linkedInUrlFromVanityInput(input: string): string {
  const vanity = linkedInVanityFromStored(input);
  if (!vanity || !VANITY_SLUG_REGEX.test(vanity)) return "";
  return `${LINKEDIN_PROFILE_PREFIX}${vanity}`;
}

/**
 * Try to turn partial or informal input into a canonical LinkedIn profile URL.
 * Returns null only when the value cannot be interpreted as a profile link.
 */
export function coerceLinkedInProfileUrl(input: string): string | null {
  const t = (input || "").trim();
  if (!t) return null;

  const fromVanityHelper = linkedInUrlFromVanityInput(t);
  if (fromVanityHelper) return fromVanityHelper;

  const linkedInPath = t.match(
    /^(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([^/?#\s]+)/i,
  );
  if (linkedInPath) {
    const vanity = decodeURIComponent(linkedInPath[1]);
    if (VANITY_SLUG_REGEX.test(vanity)) {
      return `${LINKEDIN_PROFILE_PREFIX}${vanity}`;
    }
  }

  const inOnlyPath = t.match(/^in\/([^/?#\s]+)/i);
  if (inOnlyPath) {
    const vanity = decodeURIComponent(inOnlyPath[1]);
    if (VANITY_SLUG_REGEX.test(vanity)) {
      return `${LINKEDIN_PROFILE_PREFIX}${vanity}`;
    }
  }

  // e.g. https://zaghumabbas or http://your-name
  const bareProtocolHost = t.match(/^https?:\/\/([a-zA-Z0-9][a-zA-Z0-9-]*)\/?$/i);
  if (bareProtocolHost && VANITY_SLUG_REGEX.test(bareProtocolHost[1])) {
    return `${LINKEDIN_PROFILE_PREFIX}${bareProtocolHost[1]}`;
  }

  const plainSlug = t.replace(/^@/, "").replace(/^\/*/, "").replace(/\/*$/, "");
  if (
    plainSlug &&
    VANITY_SLUG_REGEX.test(plainSlug) &&
    !plainSlug.includes(".") &&
    !/^https?/i.test(plainSlug)
  ) {
    return `${LINKEDIN_PROFILE_PREFIX}${plainSlug}`;
  }

  return null;
}

/** Normalize legacy/plain values to a full profile URL when possible. */
export function normalizeStoredLinkedInProfileUrl(stored: string): string {
  const t = (stored || "").trim();
  if (!t) return "";
  return coerceLinkedInProfileUrl(t) ?? t;
}

/**
 * When the user types a bare profile slug (not a partial `https`/`www`), coalesce to a full
 * `https://www.linkedin.com/in/...` URL so one input shows route + name together.
 */
export function shouldCoalesceBareLinkedInToFullUrl(raw: string): boolean {
  const t = raw.trim();
  if (t.length < 3) return false;
  if (/linkedin\.com/i.test(t) || /^https?:\/\//i.test(t)) return false;
  if (/[:/]/.test(t)) return false;
  const lower = t.toLowerCase();
  if (lower.length < 10) {
    if ("https://".startsWith(lower) || "http://".startsWith(lower)) return false;
    if (lower.length < 5 && "www.".startsWith(lower)) return false;
  }
  return VANITY_SLUG_REGEX.test(t);
}

export function getLinkedInProfileUrlError(stored: string): string | null {
  const t = (stored || "").trim();
  if (!t) return null;
  if (coerceLinkedInProfileUrl(t)) return null;
  return "Enter a valid LinkedIn profile URL (e.g. linkedin.com/in/your-name)";
}

export function isValidLinkedInProfileUrl(stored: string): boolean {
  return getLinkedInProfileUrlError(stored) === null;
}
