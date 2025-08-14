import { ZodOpenApiResponsesObject } from "zod-openapi";
import type { CheckPermissionsCallback } from "./types";

export const DEFAULT_SERVICE_NAME = "storybooks";

export const DEFAULT_STORAGE_CONN_STR_ENV_VAR = "AzureWebJobsStorage";

export const DEFAULT_PURGE_SCHEDULE_CRON = "0 0 0 * * *";

export const CACHE_CONTROL_PUBLIC_YEAR = "public, max-age=31536000, immutable";
export const CACHE_CONTROL_PUBLIC_WEEK = "public, max-age=604800, immutable";

export const DEFAULT_PURGE_AFTER_DAYS = 30;
export const DEFAULT_GITHUB_BRANCH = "main";

export const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

export const CONTENT_TYPES = {
  ANY: "*/*",
  JSON: "application/json",
  HTML: "text/html",
  ZIP: "application/zip",
  FORM_MULTIPART: "multipart/form-data",
  FORM_ENCODED: "application/x-www-form-urlencoded",
} as const;
export const SUPPORTED_CONTENT_TYPES = Object.values(CONTENT_TYPES);
export const SUPPORTED_CONTENT_TYPES_MSG = `Only following content-type supported: ${SUPPORTED_CONTENT_TYPES.join(
  ", "
)}.`;

export const DEFAULT_CHECK_PERMISSIONS_CALLBACK: CheckPermissionsCallback =
  () => true;

export const commonErrorResponses: ZodOpenApiResponsesObject = {
  400: { description: "Invalid request data" },
  401: { description: "Unauthenticated access" },
  403: { description: "Unauthorized access" },
  500: { description: "An unexpected server-error occurred." },
};

export const QUERY_PARAMS = {
  mode: "mode",
  newResource: "new",
  editResource: "edit",
  labelSlug: "labelSlug",
};

export const PATTERNS = {
  projectId: {
    pattern: "^[a-z0-9][a-z0-9-]{0,60}$",
    message: "Should contain only lowercase alphabets, numbers and hyphen.",
  },
} satisfies Record<
  string,
  {
    pattern: string | RegExp;
    patternGlobal?: string | RegExp;
    message?: string;
  }
>;
