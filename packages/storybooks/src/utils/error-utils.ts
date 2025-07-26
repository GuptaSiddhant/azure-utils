import type { HttpResponseInit, InvocationContext } from "@azure/functions";
import { z } from "zod/mini";

export function parseErrorMessage(error: unknown): string {
  return typeof error === "string"
    ? error
    : error instanceof z.core.$ZodError
    ? z.prettifyError(error)
    : error instanceof Error ||
      (error && typeof error === "object" && "message" in error)
    ? String(error.message)
    : String(error);
}

export function responseError(
  error: unknown,
  context: InvocationContext,
  init?: ResponseInit | number
): HttpResponseInit {
  const errorMessage = parseErrorMessage(error);
  context.error(errorMessage, error instanceof Error ? error.stack : undefined);

  const jsonBody = { errorMessage };
  const status = typeof init === "number" ? init : init?.status ?? 500;
  const headers = new Headers(typeof init === "number" ? {} : init?.headers);
  headers.set("Content-Type", "application/json");

  return { jsonBody, status, headers };
}
