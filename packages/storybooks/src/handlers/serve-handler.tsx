import { responseError } from "../utils/error-utils";
import type {
  ServeFnOptions,
  StorybooksRouterHttpHandler,
} from "../utils/types";
import { serveFile } from "../utils/serve-file";
import {
  getAzureTableClient,
  listAzureTableEntities,
} from "../utils/azure-data-tables";
import type { HttpResponseInit } from "@azure/functions";
import { ProjectsTemplate } from "../templates/projects-template";
import { CONTENT_TYPES } from "../utils/constants";
import { renderToStream } from "@kitajs/html/suspense";

export const serveStorybookHandler: StorybooksRouterHttpHandler =
  (options) => async (request, context) => {
    const { path = "" } = request.params;
    const [project, commitSha, ...filepath] = path.split("/");

    const serveFnOptions: ServeFnOptions = {
      context,
      options,
      request,
    };

    const staticFileResponse = await serveStaticFiles(serveFnOptions);
    if (staticFileResponse) {
      return staticFileResponse;
    }

    if (!project) {
      return await serveProjects(serveFnOptions);
    }

    if (!commitSha) {
      return await serveCommits(serveFnOptions, project);
    }

    if (!filepath.length || !filepath[0]) {
      return await serveCommit(serveFnOptions, project, commitSha);
    }

    try {
      return await serveFile(
        serveFnOptions,
        project,
        commitSha,
        filepath.join("/")
      );
    } catch (error) {
      return responseError(error, context);
    }
  };

async function serveStaticFiles({
  request,
}: ServeFnOptions): Promise<HttpResponseInit | undefined> {
  const { pathname } = new URL(request.url);

  if (!pathname || pathname === "/") return undefined;

  if (pathname.startsWith("/.well-know")) {
    return { status: 404 };
  }
  if (pathname.startsWith("/favicon.ico")) {
    return { status: 404 };
  }

  return undefined;
}

async function serveProjects({
  context,
  options,
  request,
}: ServeFnOptions): Promise<HttpResponseInit> {
  context.log("Serving all projects...");
  const accept = request.headers.get("accept");

  const projects = await listAzureTableEntities(context, options, "Projects");

  if (accept?.includes(CONTENT_TYPES.HTML)) {
    return {
      status: 200,
      headers: { "Content-Type": CONTENT_TYPES.HTML },
      body: renderToStream(
        <ProjectsTemplate
          projects={projects}
          basePathname={new URL(request.url).pathname}
        />
      ),
    };
  }

  return { status: 200, jsonBody: projects };
}

async function serveCommits(
  { context, options, request }: ServeFnOptions,
  project: string
): Promise<HttpResponseInit> {
  context.log(`Serving all commits for project '${project}'...`);
  const accept = request.headers.get("accept");

  const commits = await listAzureTableEntities(context, options, "Commits", {
    filter: `project eq '${project}'`,
  });

  if (accept?.includes(CONTENT_TYPES.HTML)) {
    return {
      status: 200,
      headers: { "Content-Type": CONTENT_TYPES.HTML },
      body: renderToStream(
        <ProjectsTemplate
          projects={[]}
          basePathname={new URL(request.url).pathname}
        />
      ),
    };
  }

  return { status: 200, jsonBody: commits };
}

async function serveCommit(
  { context, options, request }: ServeFnOptions,
  project: string,
  commitSha: string
): Promise<HttpResponseInit> {
  context.log(`Serving commit '${commitSha}' for project '${project}'...`);
  const accept = request.headers.get("accept");

  const commit = await getAzureTableClient(options, "Commits").getEntity(
    project,
    commitSha
  );

  if (accept?.includes(CONTENT_TYPES.HTML)) {
    return {
      status: 200,
      headers: { "Content-Type": CONTENT_TYPES.HTML },
      body: renderToStream(
        <ProjectsTemplate
          projects={[]}
          basePathname={new URL(request.url).pathname}
        />
      ),
    };
  }

  return { status: 200, jsonBody: commit };
}
