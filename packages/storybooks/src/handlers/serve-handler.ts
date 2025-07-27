import type {
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import {
  getAzureTableClient,
  listAzureTableEntities,
  odata,
} from "../utils/azure-data-tables";
import { responseError } from "../utils/error-utils";
import type {
  RouterHandlerOptions,
  StorybooksRouterHttpHandler,
} from "../utils/types";
import { getAzureStorageBlobServiceClient } from "../utils/azure-storage-blob";
import { Readable } from "node:stream";
import { CACHE_CONTROL_PUBLIC_YEAR } from "../utils/constants";

export const serveStorybookHandler: StorybooksRouterHttpHandler =
  (options) => async (request, context) => {
    const { path = "" } = request.params;

    const [project, commitSha, ...filepath] = path.split("/");

    const serveFnOptions: ServeFnOptions = {
      context,
      options,
      request,
    };

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

type ServeFnOptions = {
  context: InvocationContext;
  options: RouterHandlerOptions;
  request: HttpRequest;
};

async function serveProjects({
  context,
  options,
}: ServeFnOptions): Promise<HttpResponseInit> {
  context.log("Serving all projects...");

  const projects = await listAzureTableEntities(context, options, {
    tableSuffix: "Projects",
  });

  return { jsonBody: projects, status: 200 };
}

async function serveCommits(
  { context, options }: ServeFnOptions,
  project: string
): Promise<HttpResponseInit> {
  context.log(`Serving all commits for project '${project}'...`);

  const commits = await listAzureTableEntities(context, options, {
    tableSuffix: "Commits",
    filter: odata`project eq ${project}`,
  });

  return { jsonBody: commits, status: 200 };
}

async function serveCommit(
  { context, options }: ServeFnOptions,
  project: string,
  commitSha: string
): Promise<HttpResponseInit> {
  context.log(`Serving commit '${commitSha}' for project '${project}'...`);

  const commit = await getAzureTableClient(options, "Commits").getEntity(
    project,
    commitSha
  );

  return { jsonBody: commit, status: 200 };
}

async function serveFile(
  {
    context,
    request,
    options: { connectionString, containerName },
  }: ServeFnOptions,
  project: string,
  commitSha: string,
  filepath: string
): Promise<HttpResponseInit> {
  const blobName = `${project}/${commitSha}/${filepath}`;
  context.log(`Serve ${blobName}`);

  const blockBlobClient = getAzureStorageBlobServiceClient(connectionString)
    .getContainerClient(containerName)
    .getBlockBlobClient(blobName);

  if (!(await blockBlobClient.exists())) {
    return responseError(`File '${blobName}' not found.`, context, 404);
  }

  if (blobName.endsWith("index.html")) {
    const buffer = await blockBlobClient.downloadToBuffer(0);
    // Add a back button to the bottom of the page
    const bodyWithBackButton = buffer.toString("utf8").replace(
      `</body>`,
      `
      <div><a id="view-all" href="${request.url.replace(
        `${commitSha}/${filepath}`,
        ""
      )}"
        style="position: fixed; bottom: 0.5rem; left: 0.5rem; z-index: 9999; padding: 0.25rem 0.5rem; background-color: black; color: white; border-radius: 0.25rem; text-decoration: none; font-size: 1rem; font-face: sans-serif; font-weight: 400;">
        ← View all
      </a></div></body>`
    );

    return {
      headers: {
        "Cache-Control": CACHE_CONTROL_PUBLIC_YEAR,
        "Content-Type": "text/html; charset=utf8",
        "Content-Length": Buffer.byteLength(bodyWithBackButton).toString(),
      },
      body: bodyWithBackButton,
      status: 200,
    };
  }

  // For all other files, we stream the blob and return it
  const downloadResponse = await blockBlobClient.download(0);

  const headers = new Headers();
  headers.set("Cache-Control", CACHE_CONTROL_PUBLIC_YEAR);
  headers.set(
    "Content-Type",
    downloadResponse.contentType || "application/octet-stream"
  );
  if (downloadResponse.contentLength) {
    headers.set("Content-Length", downloadResponse.contentLength.toString());
  }
  if (downloadResponse.contentEncoding) {
    headers.set("Content-Encoding", downloadResponse.contentEncoding);
  }

  return {
    body: Readable.toWeb(downloadResponse.readableStreamBody as Readable),
    headers,
    status: 200,
  };
}
