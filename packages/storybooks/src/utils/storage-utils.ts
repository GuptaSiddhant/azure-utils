import type { InvocationContext } from "@azure/functions";
import { getAzureTableClientForProject } from "./azure-data-tables";
import {
  deleteBlobsFromAzureStorageContainerOrThrow,
  generateAzureStorageContainerName,
  getAzureStorageBlobContainerClient,
} from "./azure-storage-blob";

export async function purgeStorybookByCommitSha(
  context: InvocationContext,
  connectionString: string,
  projectId: string,
  buildSHA: string
) {
  context.info(
    `Deleting Storybook for project: ${projectId}, commit: ${buildSHA}`
  );

  try {
    await getAzureTableClientForProject(
      connectionString,
      projectId,
      "Builds"
    ).deleteEntity(projectId, buildSHA);
  } catch (error) {
    context.error(
      `Failed to delete Storybook entry for ${projectId}/${buildSHA}`,
      error
    );
  }

  try {
    await deleteBlobsFromAzureStorageContainerOrThrow(
      context,
      getAzureStorageBlobContainerClient(
        connectionString,
        generateAzureStorageContainerName(projectId)
      ),
      `${projectId}/${buildSHA}/`
    );
  } catch (error) {
    context.error(
      `Failed to delete Storybook blobs for ${projectId}/${buildSHA}`,
      error
    );
  }
}
