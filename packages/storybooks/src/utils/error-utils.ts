import { RestError } from "@azure/data-tables";
import { z } from "zod/mini";

export function parseErrorMessage(error: unknown): {
  errorMessage: string;
  errorStatus?: number;
  errorType: string;
} {
  console.log(error instanceof RestError);
  return typeof error === "string"
    ? { errorMessage: error, errorType: "string" }
    : error instanceof RestError
    ? parseAzureRestError(error)
    : error instanceof z.core.$ZodError
    ? {
        errorMessage: z.prettifyError(error),
        errorStatus: 400,
        errorType: "Zod",
      }
    : error instanceof Error ||
      (error && typeof error === "object" && "message" in error)
    ? { errorMessage: String(error.message), errorType: "error" }
    : { errorMessage: String(error), errorType: "unknown" };
}

function parseAzureRestError(error: RestError): {
  errorMessage: string;
  errorStatus?: number;
  errorType: string;
} {
  const details = (error.details ?? {}) as { [key: string]: unknown };
  const message =
    // @ts-expect-error
    details["odataError"]?.["message"]?.["value"] ??
    details["errorMessage"] ??
    error.message;

  return {
    errorMessage: `${details["errorCode"] ?? error.name} (${
      error.code ?? error.statusCode
    }): ${message}`,
    errorStatus: error.statusCode,
    errorType: "AzureRest",
  };
}
