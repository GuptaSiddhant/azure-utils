import type { HttpResponseInit, InvocationContext } from "@azure/functions";

export function parseErrorMessage(error: unknown): string {
  return typeof error === "string"
    ? error
    : error instanceof Error ||
      (error && typeof error === "object" && "message" in error)
    ? String(error.message)
    : String(error);
}

export function responseError(
  error: unknown,
  context?: InvocationContext,
  init?: ResponseInit | number
): HttpResponseInit {
  context?.error(`[${context.invocationId}]`, error);

  const jsonBody =
    typeof error === "string"
      ? { errorMessage: error }
      : { errorMessage: parseErrorMessage(error), error };
  const status = typeof init === "number" ? init : init?.status ?? 400;
  const headers = new Headers(typeof init === "number" ? {} : init?.headers);
  headers.set("Content-Type", "application/json");

  return { jsonBody, status, headers };
}
