import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import decompress from "decompress";
import {
  getAzureStorageBlobServiceClient,
  uploadDirToAzureBlobStorage,
} from "../utils/azure-storage-blob";
import type { StorybookMetadata } from "../utils/schemas";
import type {
  AzureFunctionsStorageBlobTriggerMetadata,
  StorybooksRouterStorageBlobHandler,
} from "../utils/types";

export const onStorybookUploadedHandler: StorybooksRouterStorageBlobHandler =
  (options) => async (blob, context) => {
    const { connectionString, containerName } = options;

    const triggerMetadata =
      context.triggerMetadata as AzureFunctionsStorageBlobTriggerMetadata<
        "project" | "sha",
        StorybookMetadata
      >;

    const project = triggerMetadata.project.toString();
    const sha = triggerMetadata.sha.toString();

    const containerClient =
      getAzureStorageBlobServiceClient(connectionString).getContainerClient(
        containerName
      );

    const dirpath = fs.mkdtempSync(path.join(os.tmpdir(), "storybook-"));

    if (!(blob instanceof Buffer)) {
      throw new Error(
        `Blob ${triggerMetadata.blobTrigger} is not a Buffer, skipping processing.`
      );
    }

    try {
      await decompress(blob, dirpath);

      await uploadDirToAzureBlobStorage(
        context,
        containerClient,
        dirpath,
        (blobName) => path.join(project, sha, blobName)
      );
    } finally {
      fs.rmSync(dirpath, { recursive: true, force: true });
    }
  };
