import crypto from "crypto";

export type JwtPayload = Record<string, unknown> & {
  iat?: number;
  exp?: number;
  sub?: string;
};

export const JWT_EXPIRES_SECONDS = 7 * 24 * 60 * 60; // 7 days

export function getJwtSecret(): string {
  return (
    process.env.JWT_SECRET ||
    process.env.SESSION_SECRET ||
    "layoff-proof-dev-secret-key-2024"
  );
}

/** Layoff Proof API access token (email login, Google OAuth, etc.). */
export function signAppAccessToken(payload: {
  sub: string;
  email: string;
  authProvider: string;
}): string {
  return signJwt(payload, getJwtSecret(), JWT_EXPIRES_SECONDS);
}

function b64UrlEncode(buf: Buffer) {
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function b64UrlEncodeJson(value: unknown) {
  return b64UrlEncode(Buffer.from(JSON.stringify(value)));
}

function b64UrlDecode(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + pad, "base64");
}

function timingSafeEqualString(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export function signJwt(payload: JwtPayload, secret: string, expiresInSeconds: number) {
  const header = { alg: "HS256", typ: "JWT" } as const;
  const now = Math.floor(Date.now() / 1000);
  const exp = now + Math.max(1, Math.floor(expiresInSeconds));

  const encodedHeader = b64UrlEncodeJson(header);
  const encodedPayload = b64UrlEncodeJson({ ...payload, iat: now, exp });
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto.createHmac("sha256", secret).update(signingInput).digest();
  const encodedSignature = b64UrlEncode(signature);

  return `${signingInput}.${encodedSignature}`;
}

export function verifyJwt(token: string, secret: string): JwtPayload | null {
  try {
    const [h, p, s] = token.split(".");
    if (!h || !p || !s) return null;

    const signingInput = `${h}.${p}`;
    const expectedSig = b64UrlEncode(
      crypto.createHmac("sha256", secret).update(signingInput).digest(),
    );
    if (!timingSafeEqualString(expectedSig, s)) return null;

    const payload = JSON.parse(b64UrlDecode(p).toString("utf8")) as JwtPayload;
    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp === "number" && now >= payload.exp) return null;

    return payload;
  } catch {
    return null;
  }
}
