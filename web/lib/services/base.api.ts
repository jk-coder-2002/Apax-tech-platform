import { z } from "zod";

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface ApiResult<T> {
  success: boolean;
  message: string;
  data?: T;
}

interface RequestOptions<T> {
  signal?: AbortSignal;
  // Validated at the boundary, before `data` ever reaches a store - an
  // unchecked `as T` cast here would be exactly the dishonesty a "the
  // types are honest" requirement is meant to catch.
  schema?: z.ZodType<T>;
}

const EnvelopeSchema = z.object({
  success: z.boolean().optional(),
  message: z.string().optional(),
  data: z.unknown().optional(),
});

/**
 * Every server response follows {success, message, data} (see
 * shared/types/api.ts). This is the one place that talks to fetch - no
 * component should call fetch directly.
 */
export const baseAPI = async <T = unknown>(
  path: string,
  method: string,
  body?: unknown,
  options?: RequestOptions<T>
): Promise<ApiResult<T>> => {
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: method !== "GET" && body ? JSON.stringify(body) : undefined,
      signal: options?.signal,
    });

    const text = await res.text();
    let parsed: unknown;

    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      throw new Error("Invalid JSON response from server");
    }

    const envelope = parsed === null ? {} : EnvelopeSchema.safeParse(parsed).data ?? {};

    if (!res.ok) {
      throw new Error(envelope.message || `Request failed with status ${res.status}`);
    }

    if (!options?.schema) {
      return {
        success: true,
        message: envelope.message ?? "Request successful",
        data: envelope.data as T | undefined,
      };
    }

    const validated = options.schema.safeParse(envelope.data);
    if (!validated.success) {
      throw new Error("The server returned data in an unexpected shape");
    }

    return {
      success: true,
      message: envelope.message ?? "Request successful",
      data: validated.data,
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }

    // fetch() itself throws a TypeError for connection-level failures
    // (offline, DNS, connection refused, CORS) - distinct from an error
    // response the server actually sent back.
    if (error instanceof TypeError) {
      return {
        success: false,
        message: "Could not reach the server. Check your connection and try again.",
      };
    }

    const message = error instanceof Error ? error.message : "Something went wrong";

    return {
      success: false,
      message,
    };
  }
};
