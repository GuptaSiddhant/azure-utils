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
