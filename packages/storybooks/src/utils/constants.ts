import { ZodOpenApiResponsesObject } from "zod-openapi";
import { getRequestStore } from "./stores";
import { joinUrl } from "./url-utils";

export const SERVICE_NAME = "storybooks";

export const DEFAULT_STORAGE_CONN_STR_ENV_VAR = "AzureWebJobsStorage";

export const DEFAULT_PURGE_SCHEDULE_CRON = "0 0 0 * * *";

export const CACHE_CONTROL_PUBLIC_YEAR = "public, max-age=31536000, immutable";

export const DEFAULT_PURGE_AFTER_DAYS = 30;

export const CONTENT_TYPES = {
  ANY: "*/*",
  JSON: "application/json",
  HTML: "text/html",
  ZIP: "application/zip",
  FORM_MULTIPART: "multipart/form-data",
  FORM_ENCODED: "application/x-www-form-urlencoded",
};
export const SUPPORTED_CONTENT_TYPES = Object.values(CONTENT_TYPES);
export const SUPPORTED_CONTENT_TYPES_MSG = `Only following content-type supported: ${SUPPORTED_CONTENT_TYPES.join(
  ", "
)}.`;

export const PROJECTS_TABLE_PARTITION_KEY = "projects";

export const commonErrorResponses: ZodOpenApiResponsesObject = {
  400: { description: "Invalid request data" },
  401: { description: "Unauthenticated access" },
  403: { description: "Unauthorized access" },
  500: { description: "An unexpected server-error occurred." },
};

export const urlBuilder = {
  allProjects: () => {
    const { baseRoute, url } = getRequestStore();
    return new URL(joinUrl(baseRoute, "projects"), url).toString();
  },
  projectId: (projectId: string) => {
    const { baseRoute, url } = getRequestStore();
    return new URL(joinUrl(baseRoute, "projects", projectId), url).toString();
  },
  allBuilds: (projectId: string) => {
    const { baseRoute, url } = getRequestStore();
    return new URL(
      joinUrl(baseRoute, "projects", projectId, "builds"),
      url
    ).toString();
  },
  buildSHA: (projectId: string, sha: string) => {
    const { baseRoute, url } = getRequestStore();
    return new URL(
      joinUrl(baseRoute, "projects", projectId, "builds", sha),
      url
    ).toString();
  },
  storybookIndexHtml: (projectId: string, sha: string) => {
    const { baseRoute, url } = getRequestStore();
    return new URL(
      joinUrl(baseRoute, "_", projectId, sha, "index.html"),
      url
    ).toString();
  },
  storybookZip: (projectId: string, sha: string) => {
    const { baseRoute, url } = getRequestStore();
    return new URL(
      joinUrl(baseRoute, "_", projectId, sha, "storybook.zip"),
      url
    ).toString();
  },
} satisfies Record<string, (...args: any[]) => string>;
