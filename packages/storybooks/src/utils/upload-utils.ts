import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type {
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { responseError } from "./response-utils";
import {
  generateAzureStorageContainerName,
  uploadDirToAzureBlobStorage,
} from "./azure-storage-blob";
import decompress from "decompress";
import { Readable } from "node:stream";
import { once } from "node:events";
import { BlobServiceClient } from "@azure/storage-blob";

export async function uploadZipWithDecompressed(
  context: InvocationContext,
  request: HttpRequest,
  connectionString: string,
  projectId: string,
  buildSHA: string
): Promise<HttpResponseInit | undefined> {
  const tmpDir = os.tmpdir();
  const dirpath = fs.mkdtempSync(path.join(tmpDir, "storybook-"));
  const zipFilePath = path.join(
    dirpath,
    `${projectId}-${buildSHA}-storybook.zip`
  );

  try {
    await writeStreamToFile(Readable.fromWeb(request.body!), zipFilePath);
    await decompress(zipFilePath, dirpath);

    const containerClient = BlobServiceClient.fromConnectionString(
      connectionString
    ).getContainerClient(generateAzureStorageContainerName(projectId));
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

    return;
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
