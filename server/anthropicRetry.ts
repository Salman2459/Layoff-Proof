import type Anthropic from "@anthropic-ai/sdk";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** True when Anthropic asks us to retry (overload, rate limit, etc.). */
export function isRetryableAnthropicError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as {
    status?: number;
    error?: { error?: { type?: string } };
    headers?: Record<string, unknown>;
  };
  const status = e.status;
  if (
    status === 529 ||
    status === 503 ||
    status === 502 ||
    status === 408 ||
    status === 429
  ) {
    return true;
  }
  if (e.error?.error?.type === "overloaded_error") return true;

  const headers = e.headers;
  if (headers && typeof headers === "object") {
    const raw = headers["x-should-retry"];
    if (raw === "true") return true;
  }
  return false;
}

type MessageCreateParams = Parameters<Anthropic["messages"]["create"]>[0];

/**
 * Wraps messages.create with exponential backoff for overload / rate limits.
 * Matches Anthropic guidance when x-should-retry is true or status is 529.
 */
export async function anthropicMessagesCreateWithRetry(
  client: Anthropic,
  params: MessageCreateParams,
  options?: { maxRetries?: number; baseDelayMs?: number; label?: string },
): Promise<Awaited<ReturnType<Anthropic["messages"]["create"]>>> {
  const maxRetries = options?.maxRetries ?? 6;
  const baseDelayMs = options?.baseDelayMs ?? 1500;
  const label = options?.label ?? "anthropic";
  let lastErr: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await client.messages.create(params);
    } catch (err) {
      lastErr = err;
      if (!isRetryableAnthropicError(err) || attempt === maxRetries) {
        throw err;
      }
      const delay =
        baseDelayMs * Math.pow(2, attempt) + Math.floor(Math.random() * 500);
      console.warn(
        `[${label}] Transient Anthropic error (e.g. overloaded); retry ${attempt + 1}/${maxRetries} in ${delay}ms`,
      );
      await sleep(delay);
    }
  }
  throw lastErr;
}
