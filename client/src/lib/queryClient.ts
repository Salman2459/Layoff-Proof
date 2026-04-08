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

function messageFromErrorBody(data: Record<string, unknown>): string | null {
  const msg = data.message ?? data.error;
  if (typeof msg === "string" && msg.trim()) {
    return msg;
  }
  return null;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = await res.text();
    let message = text?.trim() || res.statusText;
    if (text) {
      try {
        const json = JSON.parse(text) as Record<string, unknown>;
        const fromBody = messageFromErrorBody(json);
        if (fromBody) {
          message = fromBody;
        }
      } catch {
        // keep raw text
      }
    }
    throw new Error(message);
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
    let errorMessage = `Request failed: ${res.status}`;
    try {
      const errorData = (await res.json()) as Record<string, unknown>;
      errorMessage =
        messageFromErrorBody(errorData) || errorMessage;
    } catch {
      // Fallback to status text
    }
    throw new Error(errorMessage);
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
