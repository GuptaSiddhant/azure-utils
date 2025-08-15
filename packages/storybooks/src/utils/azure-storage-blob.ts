import fs from "node:fs";
import path from "node:path";
import type { InvocationContext } from "@azure/functions";
import type { ContainerClient, BlobClient } from "@azure/storage-blob";
import { getMimeType } from "./mime-utils";
import { parseErrorMessage } from "./error-utils";
import { DEFAULT_SERVICE_NAME } from "./constants";
import { getStore } from "./store";

export function generateAzureStorageContainerName(id: string) {
  return `${DEFAULT_SERVICE_NAME}-${id.replace(/[^\w\-]+/g, "-")}`.slice(0, 60);
}

export async function uploadDirToAzureBlobStorage(
  context: InvocationContext,
  containerClient: ContainerClient,
  dirpath: string,
  blobOptions?: (blobName: string) => string
) {
  const files = fs
    .readdirSync(dirpath, {
      recursive: true,
      withFileTypes: true,
    })
    .filter((file) => file.isFile() && !file.name.startsWith("."))
    .map((file) => path.join(file.parentPath, file.name));

  context.info(`Found ${files.length} files in dir to upload: ${dirpath}.`);

  const uploadErrors = new Map<string, string>();

  for (const filepath of files) {
    if (!fs.existsSync(filepath)) {
      context.warn(`File ${filepath} does not exist, skipping.`);
      continue;
    }

    const blobName = filepath.replace(`${dirpath}/`, "");

    try {
      const updatedBlobName = blobOptions?.(blobName) || blobName;
      context.debug(`Uploading '${filepath}' to '${blobName}'...`);

      const response = await containerClient
        .getBlockBlobClient(updatedBlobName)
        .uploadFile(filepath, {
          blobHTTPHeaders: {
            blobContentType:
              getMimeType(filepath) || "application/octet-stream",
          },
        });

      if (response.errorCode) {
        throw response.errorCode;
      }
    } catch (error) {
      const { errorMessage } = parseErrorMessage(error);
      context.error(
        `Failed to upload blob '${blobName}'. Error: ${errorMessage}`
      );
      uploadErrors.set(blobName, errorMessage);
    }
  }

  if (uploadErrors.size > 0) {
    context.error(
      `Failed to upload ${uploadErrors.size} files to container: ${containerClient.containerName}.`
    );
  } else {
    context.info(
      `All files uploaded successfully to container: ${containerClient.containerName}.`
    );
  }

  return;
}

export async function deleteBlobsFromAzureStorageContainerOrThrow(
  containerClient: ContainerClient,
  prefix: string
) {
  const { context } = getStore();

  const blobClientsToDelete: BlobClient[] = [];
  for await (const blob of containerClient.listBlobsFlat({ prefix })) {
    blobClientsToDelete.push(containerClient.getBlobClient(blob.name));
  }

  if (blobClientsToDelete.length === 0) {
    context.log(`No blobs found with the prefix '${prefix}'.`);
    return;
  }

  const response = await containerClient
    .getBlobBatchClient()
    .deleteBlobs(blobClientsToDelete);

  if (response.errorCode) {
    context.error(
      `Failed to delete blobs with prefix '${prefix}'. Error: ${response.errorCode}`
    );
    throw new Error(`Failed to delete blobs: ${response.errorCode}`);
  }

  context.info(
    `Successfully deleted ${blobClientsToDelete.length} blobs with prefix '${prefix}'.`
  );
  return response;
}
