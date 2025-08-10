import type {
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import path from "node:path";
import {
  generateAzureStorageContainerName,
  getAzureStorageBlobServiceClient,
} from "../utils/azure-storage-blob";
import { responseError } from "../utils/response-utils";
import { CACHE_CONTROL_PUBLIC_YEAR, urlBuilder } from "../utils/constants";
import { Readable } from "node:stream";
import { getRequestStore } from "../utils/stores";

export async function serveStorybook(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const { projectId = "", buildSHA = "", filepath = "" } = request.params;
  const blobName = path.posix.join(buildSHA, filepath);
  context.log("Serving SB (%s) - %s...", projectId, blobName);

  const { connectionString } = getRequestStore();
  const blockBlobClient = getAzureStorageBlobServiceClient(connectionString)
    .getContainerClient(generateAzureStorageContainerName(projectId))
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
      <div><a id="view-all" href="${urlBuilder.allBuilds(projectId)}"
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
