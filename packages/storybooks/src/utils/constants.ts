import { ZodOpenApiResponsesObject } from "zod-openapi";
import { getStore } from "./store";
import { joinUrl } from "./url-utils";
import type { CheckPermissionCallback } from "./types";
import { StorybookProject } from "./schemas";

export const DEFAULT_SERVICE_NAME = "storybooks";

export const DEFAULT_STORAGE_CONN_STR_ENV_VAR = "AzureWebJobsStorage";

export const DEFAULT_PURGE_SCHEDULE_CRON = "0 0 0 * * *";

export const CACHE_CONTROL_PUBLIC_YEAR = "public, max-age=31536000, immutable";
export const CACHE_CONTROL_PUBLIC_WEEK = "public, max-age=604800, immutable";

export const DEFAULT_PURGE_AFTER_DAYS = 30;

export const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

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

export const DEFAULT_CHECK_PERMISSIONS_CALLBACK: CheckPermissionCallback = () =>
  true;

export const PROJECTS_TABLE_PARTITION_KEY = "projects";

export const commonErrorResponses: ZodOpenApiResponsesObject = {
  400: { description: "Invalid request data" },
  401: { description: "Unauthenticated access" },
  403: { description: "Unauthorized access" },
  500: { description: "An unexpected server-error occurred." },
};

/**
 * URL builder for the Storybooks router.
 */
export const urlBuilder = {
  home: (...pathnames: string[]) => {
    const { baseRoute, url } = getStore();
    return new URL(joinUrl(baseRoute, ...pathnames), url).toString();
  },
  staticFile: (filepath: string) => {
    const { baseRoute, url } = getStore();
    return new URL(joinUrl(baseRoute, filepath), url).toString();
  },
  allProjects: () => {
    const { baseRoute, url } = getStore();
    return new URL(joinUrl(baseRoute, "projects"), url).toString();
  },
  projectId: (projectId: string) => {
    const { baseRoute, url } = getStore();
    return new URL(joinUrl(baseRoute, "projects", projectId), url).toString();
  },
  allBuilds: (projectId: string) => {
    const { baseRoute, url } = getStore();
    return new URL(
      joinUrl(baseRoute, "projects", projectId, "builds"),
      url
    ).toString();
  },
  buildSHA: (projectId: string, sha: string) => {
    const { baseRoute, url } = getStore();
    return new URL(
      joinUrl(baseRoute, "projects", projectId, "builds", sha),
      url
    ).toString();
  },
  allLabels: (projectId: string) => {
    const { baseRoute, url } = getStore();
    return new URL(
      joinUrl(baseRoute, "projects", projectId, "labels"),
      url
    ).toString();
  },
  labelSlug: (projectId: string, labelSlug: string) => {
    const { baseRoute, url } = getStore();
    return new URL(
      joinUrl(baseRoute, "projects", projectId, "labels", labelSlug),
      url
    ).toString();
  },
  labelSlugLatest: (projectId: string, labelSlug: string) => {
    const { baseRoute, url } = getStore();
    return new URL(
      joinUrl(baseRoute, "projects", projectId, "labels", labelSlug, "latest"),
      url
    ).toString();
  },
  storybookIndexHtml: (projectId: string, sha: string) => {
    const { baseRoute, url } = getStore();
    return new URL(
      joinUrl(baseRoute, "_", projectId, sha, "index.html"),
      url
    ).toString();
  },
  storybookTestReport: (projectId: string, sha: string) => {
    const { baseRoute, url } = getStore();
    return new URL(
      joinUrl(baseRoute, "_", projectId, sha, "report", "index.html"),
      url
    ).toString();
  },
  storybookCoverage: (projectId: string, sha: string) => {
    const { baseRoute, url } = getStore();
    return new URL(
      joinUrl(baseRoute, "_", projectId, sha, "coverage", "index.html"),
      url
    ).toString();
  },
  storybookZip: (projectId: string, sha: string) => {
    const { baseRoute, url } = getStore();
    return new URL(
      joinUrl(baseRoute, "_", projectId, sha, "storybook.zip"),
      url
    ).toString();
  },
  gitHub: (project: StorybookProject, ...pathnames: string[]) => {
    return new URL(
      joinUrl(project.gitHubRepo, ...pathnames),
      "https://github.com"
    ).toString();
  },
} satisfies Record<string, (...args: any[]) => string>;
