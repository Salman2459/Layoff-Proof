import type Anthropic from "@anthropic-ai/sdk";
import {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIUserAbortError,
} from "@anthropic-ai/sdk";

type AnthropicMessage = Anthropic.Message;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const RETRYABLE_HTTP_STATUSES = new Set([529, 500, 502, 503, 504]);

const DEFAULT_MAX_RETRIES = 6;
const DEFAULT_BASE_DELAY_MS = 1500;
const DEFAULT_MAX_DELAY_MS = 60_000;
const DEFAULT_JITTER_MS = 750;
const DEFAULT_PER_REQUEST_TIMEOUT_MS = 30_000;
const DEFAULT_QUEUE_CONCURRENCY = 2;

type MessageCreateParams = Parameters<Anthropic["messages"]["create"]>[0];

export type AnthropicMessagesCreateSuccess = {
  ok: true;
  message: AnthropicMessage;
};

export type AnthropicMessagesCreateFailure = {
  ok: false;
  error: string;
  status?: number;
  requestId?: string | null;
  cause?: unknown;
};

export type AnthropicMessagesCreateResult =
  | AnthropicMessagesCreateSuccess
  | AnthropicMessagesCreateFailure;

export type AnthropicRetryOptions = {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitterMs?: number;
  perRequestTimeoutMs?: number;
  label?: string;
  /** Aborts all attempts when triggered (e.g. client disconnect). */
  signal?: AbortSignal;
  /** Max concurrent Anthropic calls through this helper (default 2). */
  queueConcurrency?: number;
};

function normalizeHeaderValue(
  headers: unknown,
  name: string,
): string | undefined {
  if (!headers || typeof headers !== "object") return undefined;
  const lower = name.toLowerCase();
  const h = headers as Record<string, unknown>;
  for (const [key, value] of Object.entries(h)) {
    if (key.toLowerCase() === lower && value != null) {
      return String(value);
    }
  }
  return undefined;
}

function getErrorMeta(err: unknown): {
  status?: number;
  headers?: Record<string, unknown>;
  requestId?: string | null;
  errorType?: string;
  message?: string;
} {
  if (!err || typeof err !== "object") {
    return { message: err instanceof Error ? err.message : String(err) };
  }
  const e = err as {
    status?: number;
    headers?: Record<string, unknown>;
    request_id?: string | null;
    error?: { error?: { type?: string; message?: string } };
    message?: string;
  };
  const nested = e.error?.error;
  return {
    status: e.status,
    headers: e.headers,
    requestId: e.request_id ?? null,
    errorType: nested?.type,
    message: nested?.message ?? e.message,
  };
}

function isNetworkError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  if (
    err instanceof APIConnectionError ||
    err instanceof APIConnectionTimeoutError
  ) {
    return true;
  }
  if (err instanceof APIUserAbortError) {
    return true;
  }
  const cause = (err as { cause?: { code?: string } }).cause;
  const code = cause?.code;
  if (
    code === "ECONNRESET" ||
    code === "ETIMEDOUT" ||
    code === "ENOTFOUND" ||
    code === "EAI_AGAIN" ||
    code === "ECONNREFUSED" ||
    code === "UND_ERR_CONNECT_TIMEOUT"
  ) {
    return true;
  }
  const name = (err as { name?: string }).name;
  if (name === "FetchError") return true;
  return false;
}

/**
 * Retry only when safe: listed HTTP statuses, network failures, or overload type,
 * and never when Anthropic sets x-should-retry: false.
 */
export function isRetryableAnthropicError(err: unknown): boolean {
  const { status, headers, errorType } = getErrorMeta(err);
  const shouldRetryHeader = normalizeHeaderValue(headers, "x-should-retry");

  if (shouldRetryHeader === "false") {
    return false;
  }

  if (isNetworkError(err)) {
    return true;
  }

  if (errorType === "overloaded_error") {
    return true;
  }

  if (status !== undefined && RETRYABLE_HTTP_STATUSES.has(status)) {
    return true;
  }

  if (shouldRetryHeader === "true") {
    return status !== undefined && RETRYABLE_HTTP_STATUSES.has(status);
  }

  return false;
}

function computeBackoffDelayMs(
  attemptIndex: number,
  baseDelayMs: number,
  maxDelayMs: number,
  jitterMs: number,
): number {
  const exp = Math.min(
    maxDelayMs,
    baseDelayMs * Math.pow(2, attemptIndex),
  );
  const jitter = jitterMs > 0 ? Math.floor(Math.random() * (jitterMs + 1)) : 0;
  return Math.min(maxDelayMs, exp + jitter);
}

function failureFromError(err: unknown): AnthropicMessagesCreateFailure {
  const meta = getErrorMeta(err);
  const { status, requestId, message, errorType } = meta;
  let error =
    "The AI service is temporarily unavailable. Please try again shortly.";
  if (typeof message === "string" && message.trim()) {
    error = message.trim();
  } else if (err instanceof Error && err.message) {
    error = err.message;
  }
  if (status === 529 || errorType === "overloaded_error") {
    error =
      "The AI service is temporarily overloaded. Please wait a moment and try again.";
  }
  return { ok: false, error, status, requestId, cause: err };
}

function createConcurrencyLimiter(maxConcurrent: number) {
  let active = 0;
  const queue: Array<() => void> = [];

  const pump = () => {
    while (active < maxConcurrent && queue.length > 0) {
      const run = queue.shift()!;
      active++;
      run();
    }
  };

  return function limit<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const run = () => {
        fn()
          .then(resolve, reject)
          .finally(() => {
            active--;
            pump();
          });
      };
      queue.push(run);
      pump();
    });
  };
}

const limitersByConcurrency = new Map<
  number,
  ReturnType<typeof createConcurrencyLimiter>
>();

function getConcurrencyLimiter(concurrency: number) {
  let limiter = limitersByConcurrency.get(concurrency);
  if (!limiter) {
    limiter = createConcurrencyLimiter(concurrency);
    limitersByConcurrency.set(concurrency, limiter);
  }
  return limiter;
}

/**
 * Wraps messages.create with exponential backoff, jitter, per-request timeout,
 * global concurrency limiting, and x-should-retry handling.
 * Disables the SDK's internal retries (maxRetries: 0) so this layer owns policy.
 */
export async function anthropicMessagesCreateWithRetry(
  client: Anthropic,
  params: MessageCreateParams,
  options?: AnthropicRetryOptions,
): Promise<AnthropicMessagesCreateResult> {
  const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseDelayMs = options?.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const maxDelayMs = options?.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
  const jitterMs = options?.jitterMs ?? DEFAULT_JITTER_MS;
  const perRequestTimeoutMs =
    options?.perRequestTimeoutMs ?? DEFAULT_PER_REQUEST_TIMEOUT_MS;
  const label = options?.label ?? "anthropic";
  const userSignal = options?.signal;
  const concurrency =
    options?.queueConcurrency ?? DEFAULT_QUEUE_CONCURRENCY;

  const limiter =
    concurrency <= 0
      ? <T>(fn: () => Promise<T>) => fn()
      : getConcurrencyLimiter(concurrency);

  return limiter(async () => {
    let lastErr: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (userSignal?.aborted) {
        return {
          ok: false,
          error: "Request was cancelled.",
          cause: userSignal.reason,
        };
      }

      const requestController = new AbortController();
      const timeoutId = setTimeout(() => {
        requestController.abort();
      }, perRequestTimeoutMs);

      const onUserAbort = () => requestController.abort();
      if (userSignal) {
        if (userSignal.aborted) {
          clearTimeout(timeoutId);
          return {
            ok: false,
            error: "Request was cancelled.",
            cause: userSignal.reason,
          };
        }
        userSignal.addEventListener("abort", onUserAbort, { once: true });
      }

      try {
        const message = await client.messages.create(params, {
          signal: requestController.signal,
          timeout: perRequestTimeoutMs,
          maxRetries: 0,
        });

        clearTimeout(timeoutId);
        if (userSignal) {
          userSignal.removeEventListener("abort", onUserAbort);
        }

        return { ok: true, message: message as AnthropicMessage };
      } catch (err) {
        clearTimeout(timeoutId);
        if (userSignal) {
          userSignal.removeEventListener("abort", onUserAbort);
        }

        lastErr = err;

        if (userSignal?.aborted) {
          return {
            ok: false,
            error: "Request was cancelled.",
            cause: userSignal.reason,
          };
        }

        const retryable = isRetryableAnthropicError(err);
        const isLast = attempt >= maxRetries;

        if (!retryable || isLast) {
          if (!isLast) {
            return failureFromError(err);
          }
          console.warn(
            `[${label}] Anthropic retries exhausted after ${attempt + 1} attempt(s).`,
            getErrorMeta(err),
          );
          return failureFromError(err);
        }

        const delayMs = computeBackoffDelayMs(
          attempt,
          baseDelayMs,
          maxDelayMs,
          jitterMs,
        );
        const meta = getErrorMeta(err);
        console.warn(
          `[${label}] Retry ${attempt + 1}/${maxRetries} in ${delayMs}ms (status=${meta.status ?? "n/a"} request_id=${meta.requestId ?? "n/a"} x-should-retry=${normalizeHeaderValue(meta.headers, "x-should-retry") ?? "n/a"})`,
        );

        await sleep(delayMs);
      }
    }

    return failureFromError(lastErr);
  });
}
