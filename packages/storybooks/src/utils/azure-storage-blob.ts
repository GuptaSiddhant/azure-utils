import fs from "node:fs";
import path from "node:path";
import type { InvocationContext } from "@azure/functions";
import {
  BlobServiceClient,
  type ContainerCreateOptions,
  type ContainerClient,
} from "@azure/storage-blob";
import { getMimeType } from "./mime-utils";
import { parseErrorMessage } from "./error-utils";

export function getAzureStorageBlobServiceClient(connectionString: string) {
  return BlobServiceClient.fromConnectionString(connectionString);
}

export async function getOrCreateAzureStorageBlobContainerClientOrThrow(
  context: InvocationContext,
  connectionString: string,
  containerName: string,
  options?: ContainerCreateOptions
): Promise<ContainerClient> {
  const service = getAzureStorageBlobServiceClient(connectionString);
  const containerClient = service.getContainerClient(containerName);

  if (!(await containerClient.exists())) {
    context.info(`Creating container ${containerName}.`);
    await containerClient.create(options);
  }

  return containerClient;
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
      const errorMessage = parseErrorMessage(error);
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
