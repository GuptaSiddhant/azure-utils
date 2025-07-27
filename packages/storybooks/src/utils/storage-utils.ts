import type { InvocationContext } from "@azure/functions";
import { getAzureTableClient } from "./azure-data-tables";
import {
  deleteBlobsFromAzureStorageContainerOrThrow,
  getAzureStorageBlobContainerClient,
} from "./azure-storage-blob";
import type { RouterHandlerOptions } from "./types";

export async function purgeStorybookByCommitSha(
  context: InvocationContext,
  options: RouterHandlerOptions,
  project: string,
  commitSha: string
) {
  context.info(
    `Deleting Storybook for project: ${project}, commit: ${commitSha}`
  );

  try {
    await getAzureTableClient(options, "Commits").deleteEntity(
      project,
      commitSha
    );
  } catch (error) {
    context.error(
      `Failed to delete Storybook entry for ${project}/${commitSha}`,
      error
    );
  }

  try {
    await deleteBlobsFromAzureStorageContainerOrThrow(
      context,
      getAzureStorageBlobContainerClient(options),
      `${project}/${commitSha}/`
    );
  } catch (error) {
    context.error(
      `Failed to delete Storybook blobs for ${project}/${commitSha}`,
      error
    );
  }
}
