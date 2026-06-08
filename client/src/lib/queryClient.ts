import { QueryClient, QueryFunction } from "@tanstack/react-query";

/** Human-readable text from thrown API/network errors (for toasts). */
export function getApiErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again."
): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  if (typeof error === "string" && error.trim()) {
    return error;
  }
  return fallback;
}

/** Extract `message` or `error` from an API JSON body. */
export function extractApiErrorMessage(
  data: Record<string, unknown>,
  fallback = "Something went wrong. Please try again."
): string {
  const msg = data.message ?? data.error;
  if (typeof msg === "string" && msg.trim()) {
    return msg;
  }
  return fallback;
}

/** Parse a fetch response body as JSON (non-JSON bodies become `{ error: text }`). */
export async function parseFetchJsonBody(
  res: Response
): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { error: text.trim() };
  }
}

/** `fetch` + JSON parse; throws with the API error message when the response is not ok. */
export async function fetchJson<T = Record<string, unknown>>(
  input: RequestInfo | URL,
  init?: RequestInit,
  errorFallback?: string
): Promise<T> {
  const res = await fetch(input, init);
  const body = await parseFetchJsonBody(res);
  if (!res.ok) {
    throw new Error(
      extractApiErrorMessage(
        body,
        errorFallback ?? `Request failed (${res.status})`
      )
    );
  }
  return body as T;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const body = await parseFetchJsonBody(res);
    throw new Error(
      extractApiErrorMessage(body, res.statusText || "Request failed")
    );
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown
): Promise<any> {
  const isFormData = data instanceof FormData;

  const res = await fetch(url, {
    method,
    headers: !isFormData && data
      ? { "Content-Type": "application/json" }
      : undefined,
    body: data
      ? isFormData
        ? data
        : JSON.stringify(data)
      : undefined,
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    const errorData = await parseFetchJsonBody(res);
    throw new Error(
      extractApiErrorMessage(errorData, `Request failed (${res.status})`)
    );
  }

  // Handle empty responses
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return await res.json();
  }
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
    async ({ queryKey }) => {
      const res = await fetch(queryKey.join("/") as string, {
        credentials: "include",
        // Avoid stale auth (and other API) responses from the HTTP cache after logout.
        cache: "no-store",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
