import { QUERY_PARAMS } from "./constants";
import { getStore } from "./store";
import { joinUrl } from "./url-utils";

/**
 * URL builder for the Storybooks router.
 * @private
 */
export const urlBuilder = {
  root: (...pathnames: string[]) => {
    const { baseRoute, url: base } = getStore();
    const url = new URL(joinUrl(baseRoute, ...pathnames), base);
    return url.toString();
  },
  staticFile: (filepath: string) => {
    const { baseRoute, url: base } = getStore();
    const url = new URL(joinUrl(baseRoute, filepath), base);
    return url.toString();
  },
  allProjects: () => {
    const { baseRoute, url: base } = getStore();
    const url = new URL(joinUrl(baseRoute, "projects"), base);
    return url.toString();
  },
  projectCreate: () => {
    const { baseRoute, url: base } = getStore();
    const url = new URL(joinUrl(baseRoute, "projects"), base);
    url.searchParams.set(QUERY_PARAMS.newResource, "");
    return url.toString();
  },
  projectId: (projectId: string) => {
    const { baseRoute, url: base } = getStore();
    const url = new URL(joinUrl(baseRoute, "projects", projectId), base);
    return url.toString();
  },
  projectIdEdit: (projectId: string) => {
    const { baseRoute, url: base } = getStore();
    const url = new URL(joinUrl(baseRoute, "projects", projectId), base);
    url.searchParams.set(QUERY_PARAMS.editResource, "");
    return url.toString();
  },
  allBuilds: (projectId: string) => {
    const { baseRoute, url: base } = getStore();
    const url = new URL(
      joinUrl(baseRoute, "projects", projectId, "builds"),
      base
    );
    return url.toString();
  },
  buildSHA: (projectId: string, sha: string) => {
    const { baseRoute, url: base } = getStore();
    const url = new URL(
      joinUrl(baseRoute, "projects", projectId, "builds", sha),
      base
    );
    return url.toString();
  },
  allLabels: (projectId: string) => {
    const { baseRoute, url: base } = getStore();
    const url = new URL(
      joinUrl(baseRoute, "projects", projectId, "labels"),
      base
    );
    return url.toString();
  },
  labelSlug: (projectId: string, labelSlug: string) => {
    const { baseRoute, url: base } = getStore();
    const url = new URL(
      joinUrl(baseRoute, "projects", projectId, "labels", labelSlug),
      base
    );
    return url.toString();
  },
  labelSlugLatest: (projectId: string, labelSlug: string) => {
    const { baseRoute, url: base } = getStore();
    const url = new URL(
      joinUrl(baseRoute, "projects", projectId, "labels", labelSlug, "latest"),
      base
    );
    return url.toString();
  },
  storybookIndexHtml: (projectId: string, sha: string) => {
    const { baseRoute, url: base } = getStore();
    const url = new URL(
      joinUrl(baseRoute, "_", projectId, sha, "index.html"),
      base
    );
    return url.toString();
  },
  storybookTestReport: (projectId: string, sha: string) => {
    const { baseRoute, url: base } = getStore();
    const url = new URL(
      joinUrl(baseRoute, "_", projectId, sha, "report", "index.html"),
      base
    );
    return url.toString();
  },
  storybookCoverage: (projectId: string, sha: string) => {
    const { baseRoute, url: base } = getStore();
    const url = new URL(
      joinUrl(baseRoute, "_", projectId, sha, "coverage", "index.html"),
      base
    );
    return url.toString();
  },
  storybookZip: (projectId: string, sha: string) => {
    const { baseRoute, url: base } = getStore();
    const url = new URL(
      joinUrl(baseRoute, "_", projectId, sha, "storybook.zip"),
      base
    );
    return url.toString();
  },
  gitHub: (gitHubRepo: string, ...pathnames: string[]) => {
    const url = new URL(
      joinUrl(gitHubRepo, ...pathnames),
      "https://github.com"
    );
    return url.toString();
  },
} satisfies Record<string, (...args: any[]) => string>;
