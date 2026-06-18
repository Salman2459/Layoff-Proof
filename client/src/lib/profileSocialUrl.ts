function hasValidHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost") return true;
  return h.includes(".") && !h.startsWith(".") && !h.endsWith(".");
}

/** Normalize optional website-style URLs. Returns "" when empty, null when invalid. */
export function coerceOptionalHttpUrl(input: string): string | null {
  const t = (input || "").trim();
  if (!t) return "";

  let candidate = t;
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  try {
    const url = new URL(candidate);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    if (!hasValidHostname(url.hostname)) return null;
    const href = url.href;
    return href.endsWith("/") && url.pathname === "/" ? href.slice(0, -1) : href;
  } catch {
    return null;
  }
}

export function getOptionalHttpUrlError(
  input: string,
  label = "URL",
): string | null {
  const t = (input || "").trim();
  if (!t) return null;
  if (coerceOptionalHttpUrl(t) !== null) return null;
  return `Enter a valid ${label} (e.g. https://example.com)`;
}

/** Returns "" when empty, null when invalid. */
export function coerceGitHubUrl(input: string): string | null {
  const t = (input || "").trim();
  if (!t) return "";

  const fromPath = t.match(
    /^(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)/i,
  );
  if (fromPath) return `https://github.com/${fromPath[1]}`;

  const bare = t.replace(/^@/, "").replace(/^\/+|\/+$/g, "");
  if (/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(bare)) {
    return `https://github.com/${bare}`;
  }

  const generic = coerceOptionalHttpUrl(t);
  if (generic && /github\.com/i.test(generic)) return generic;
  return null;
}

export function getGitHubUrlError(input: string): string | null {
  const t = (input || "").trim();
  if (!t) return null;
  if (coerceGitHubUrl(t) !== null) return null;
  return "Enter a valid GitHub URL (e.g. github.com/username)";
}

/** Returns "" when empty, null when invalid. */
export function coerceTwitterUrl(input: string): string | null {
  const t = (input || "").trim();
  if (!t) return "";

  const fromPath = t.match(
    /^(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]{1,15})/i,
  );
  if (fromPath) return `https://x.com/${fromPath[1]}`;

  const bare = t.replace(/^@/, "").replace(/^\/+|\/+$/g, "");
  if (/^[a-zA-Z0-9_]{1,15}$/.test(bare)) {
    return `https://x.com/${bare}`;
  }

  const generic = coerceOptionalHttpUrl(t);
  if (generic && /(?:twitter|x)\.com/i.test(generic)) return generic;
  return null;
}

export function getTwitterUrlError(input: string): string | null {
  const t = (input || "").trim();
  if (!t) return null;
  if (coerceTwitterUrl(t) !== null) return null;
  return "Enter a valid X/Twitter URL (e.g. x.com/username)";
}
