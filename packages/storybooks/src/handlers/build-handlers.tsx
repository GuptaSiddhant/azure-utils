import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type {
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import type { RouterHandlerOptions } from "../utils/types";
import { responseError, responseHTML } from "../utils/response-utils";
import {
  getAzureProjectsTableClient,
  getAzureTableClientForProject,
  listAzureTableEntities,
  upsertStorybookBuildToAzureTable,
  upsertStorybookLabelsToAzureTable,
} from "../utils/azure-data-tables";
import {
  StorybookBuild,
  storybookBuildSchema,
  storybookBuildUploadSchema,
} from "../utils/schemas";
import {
  CONTENT_TYPES,
  PROJECTS_TABLE_PARTITION_KEY,
  urlBuilder,
} from "../utils/constants";
import { DocumentLayout } from "../components/layout";
import { RawDataPreview } from "../components/raw-data";
import { generateRequestStore, requestStore } from "../utils/stores";
import { urlSearchParamsToObject } from "../utils/url-utils";
import { BuildTable } from "../components/builds-table";
import {
  generateAzureStorageContainerName,
  getOrCreateAzureStorageBlobContainerClientOrThrow,
  uploadDirToAzureBlobStorage,
} from "../utils/azure-storage-blob";
import decompress from "decompress";
import { Readable } from "node:stream";
import { once } from "node:events";

export async function listBuilds(
  options: RouterHandlerOptions,
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  requestStore.enterWith(generateRequestStore(request, options));

  const { projectId = "" } = request.params;
  context.log("Serving all builds for project '%s'...", projectId);

  try {
    const entities = await listAzureTableEntities(
      context,
      getAzureTableClientForProject(
        options.connectionString,
        projectId,
        "Builds"
      )
    );
    const builds = storybookBuildSchema.array().parse(entities);

    const accept = request.headers.get("accept");
    if (accept?.includes(CONTENT_TYPES.HTML)) {
      return responseHTML(
        <DocumentLayout
          title="All Builds"
          breadcrumbs={["Projects", projectId]}
        >
          <BuildTable builds={builds} />
        </DocumentLayout>
      );
    }

    return { status: 200, jsonBody: builds };
  } catch (error) {
    return responseError(error, context);
  }
}

export async function getBuild(
  options: RouterHandlerOptions,
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  requestStore.enterWith(generateRequestStore(request, options));

  const { projectId = "", buildSHA = "" } = request.params;
  context.log("Getting build '%s' for project '%s'...", buildSHA, projectId);

  try {
    const client = getAzureTableClientForProject(
      options.connectionString,
      projectId,
      "Builds"
    );
    const buildDetails = storybookBuildSchema.parse(
      await client.getEntity(projectId!, buildSHA!)
    );

    const accept = request.headers.get("accept");
    if (accept?.includes(CONTENT_TYPES.HTML)) {
      return responseHTML(
        <DocumentLayout
          title={buildSHA}
          breadcrumbs={["Projects", projectId, "Builds"]}
        >
          <>
            <RawDataPreview data={buildDetails} />
            <a href={urlBuilder.storybookIndexHtml(projectId, buildSHA)}>
              View Storybook
            </a>
          </>
        </DocumentLayout>
      );
    }

    return { status: 200, jsonBody: buildDetails };
  } catch (error) {
    return responseError(error, context);
  }
}

export async function deleteBuild(
  options: RouterHandlerOptions,
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  requestStore.enterWith(generateRequestStore(request, options));

  const { projectId = "", buildSHA = "" } = request.params;
  context.log("Deleting build '%s' for project '%s'...", buildSHA, projectId);

  try {
    const client = getAzureTableClientForProject(
      options.connectionString,
      projectId,
      "Builds"
    );
    await client.deleteEntity(projectId, buildSHA);

    const buildsUrl = urlBuilder.allBuilds(projectId);
    const accept = request.headers.get("accept");
    if (accept?.includes(CONTENT_TYPES.HTML)) {
      return { status: 303, headers: { Location: buildsUrl } };
    }

    return { status: 204, headers: { Location: buildsUrl } };
  } catch (error) {
    return responseError(error, context);
  }
}

export async function uploadBuild(
  options: RouterHandlerOptions,
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  requestStore.enterWith(generateRequestStore(request, options));

  const { projectId = "" } = request.params;
  try {
    await getAzureProjectsTableClient(options.connectionString).getEntity(
      PROJECTS_TABLE_PARTITION_KEY,
      projectId
    );
  } catch {
    return responseError(
      `The project '${projectId}' does not exist.`,
      context,
      404
    );
  }

  context.log("Uploading build for project '%s'...", projectId);

  const queryParseResult = storybookBuildUploadSchema.safeParse(
    urlSearchParamsToObject(request.query)
  );
  if (!queryParseResult.success) {
    return responseError(queryParseResult.error, context, 400);
  }

  const buildData = queryParseResult.data;
  try {
    const bodyValidationResponse = validateBuildUploadBody(request, context);
    if (typeof bodyValidationResponse === "object") {
      return bodyValidationResponse;
    }

    const blobName = await uploadZipWithDecompressed(
      context,
      request,
      options.connectionString,
      projectId,
      buildData.sha
    );

    const labelIds = await upsertStorybookLabelsToAzureTable(
      options,
      context,
      projectId,
      buildData.labels
    );

    const data: StorybookBuild = {
      ...buildData,
      project: projectId,
      labels: labelIds.join(","),
    };

    await upsertStorybookBuildToAzureTable(options, context, data);

    return { status: 202, jsonBody: { blobName, data } };
  } catch (error) {
    return responseError(error, context);
  }
}

function validateBuildUploadBody(
  request: HttpRequest,
  context: InvocationContext
): HttpResponseInit | undefined {
  const body = request.body;
  if (!body) {
    return responseError("Request body is required", context, 400);
  }
  const contentLength = request.headers.get("Content-Length");
  if (!contentLength) {
    return responseError("Content-Length header is required", context, 411);
  }
  if (parseInt(contentLength, 10) === 0) {
    return responseError("Request body should have length > 0", context, 400);
  }
  if (request.headers.get("content-type") !== "application/zip") {
    return responseError(
      "Invalid content type, expected application/zip",
      context,
      415
    );
  }

  return undefined;
}

async function uploadZipWithDecompressed(
  context: InvocationContext,
  request: HttpRequest,
  connectionString: string,
  projectId: string,
  buildSHA: string
) {
  const tmpDir = os.tmpdir();
  const dirpath = fs.mkdtempSync(path.join(tmpDir, "storybook-"));
  const zipFilePath = path.join(
    dirpath,
    `${projectId}-${buildSHA}-storybook.zip`
  );

  try {
    await writeStreamToFile(Readable.fromWeb(request.body!), zipFilePath);
    await decompress(zipFilePath, dirpath);

    const containerClient =
      await getOrCreateAzureStorageBlobContainerClientOrThrow(
        context,
        connectionString,
        generateAzureStorageContainerName(projectId)
      );
    const blobName = `${buildSHA}/storybook.zip`;

    context.debug(
      `Uploading stream to blob: ${blobName} (container: ${containerClient.containerName})`
    );

    const uploadResponse = await containerClient
      .getBlockBlobClient(blobName)
      .uploadFile(zipFilePath, {
        blobHTTPHeaders: {
          blobContentType: "application/zip",
          blobContentEncoding: "utf8",
          blobCacheControl: "public, max-age=31536000",
        },
      });

    if (uploadResponse.errorCode) {
      return responseError(
        "Failed to upload Storybook.",
        context,
        uploadResponse._response.status
      );
    }

    await uploadDirToAzureBlobStorage(
      context,
      containerClient,
      dirpath,
      (blobName) => path.join(buildSHA, blobName)
    );

    return blobName;
  } finally {
    fs.rmSync(dirpath, { recursive: true, force: true });
  }
}

async function writeStreamToFile(readable: Readable, filePath: string) {
  const writable = fs.createWriteStream(filePath);
  for await (const chunk of readable) {
    if (!writable.write(chunk)) {
      // Wait if backpressure is applied
      await once(writable, "drain");
    }
  }
  writable.end();
  await once(writable, "finish");
}
