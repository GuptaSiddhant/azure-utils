import type {
  ServeFnOptions,
  StorybooksRouterHttpHandler,
} from "../utils/types";
import { serveFile } from "../utils/serve-file";
import {
  getAzureProjectsTableClient,
  getAzureTableClientForProject,
  listAzureTableEntities,
} from "../utils/azure-data-tables";
import type { HttpResponseInit } from "@azure/functions";
import { ProjectsTable } from "../templates/projects-table";
import { CONTENT_TYPES } from "../utils/constants";
import { responseError, responseHTML } from "../utils/response-utils";

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

  const projects = await listAzureTableEntities(
    context,
    getAzureProjectsTableClient(options.connectionString)
  );

  if (accept?.includes(CONTENT_TYPES.HTML)) {
    return responseHTML(<ProjectsTable projects={[]} />);
  }

  return { status: 200, jsonBody: projects };
}

async function serveCommits(
  { context, options, request }: ServeFnOptions,
  project: string
): Promise<HttpResponseInit> {
  context.log(`Serving all commits for project '${project}'...`);
  const accept = request.headers.get("accept");

  const commits = await listAzureTableEntities(
    context,
    getAzureTableClientForProject(options.connectionString, project, "Builds")
  );

  if (accept?.includes(CONTENT_TYPES.HTML)) {
    return responseHTML(<ProjectsTable projects={[]} />);
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

  const commit = await getAzureTableClientForProject(
    options.connectionString,
    project,
    "Builds"
  ).getEntity(project, commitSha);

  if (accept?.includes(CONTENT_TYPES.HTML)) {
    return responseHTML(<ProjectsTable projects={[]} />);
  }

  return { status: 200, jsonBody: commit };
}
