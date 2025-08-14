import { getStore } from "./store";
import { joinUrl } from "./url-utils";

/**
 * URL builder for the Storybooks router.
 * @private
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
  gitHub: (gitHubRepo: string, ...pathnames: string[]) => {
    return new URL(
      joinUrl(gitHubRepo, ...pathnames),
      "https://github.com"
    ).toString();
  },
} satisfies Record<string, (...args: any[]) => string>;
