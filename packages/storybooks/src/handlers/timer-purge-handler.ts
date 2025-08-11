import {
  getAzureProjectsTableClient,
  getAzureTableClientForProject,
  listAzureTableEntities,
} from "../utils/azure-data-tables";
import { DEFAULT_PURGE_AFTER_DAYS, ONE_DAY_IN_MS } from "../utils/constants";
import { InvocationContext, TimerHandler } from "@azure/functions";
import { storybookProjectSchema } from "../utils/schemas";
import {
  deleteBlobsFromAzureStorageContainerOrThrow,
  generateAzureStorageContainerName,
  getAzureStorageBlobContainerClient,
} from "../utils/azure-storage-blob";

export function timerPurgeHandler(connectionString: string): TimerHandler {
  return async (timer, context) => {
    context.log(
      "Timer triggered to purge old builds...",
      JSON.stringify(timer)
    );

    const entities = await listAzureTableEntities(
      context,
      getAzureProjectsTableClient(connectionString)
    );
    const projects = storybookProjectSchema.array().parse(entities);

    for (const project of projects) {
      const { id, purgeBuildsAfterDays = DEFAULT_PURGE_AFTER_DAYS } = project;
      const expiryTime = new Date(
        Date.now() - purgeBuildsAfterDays * ONE_DAY_IN_MS
      );

      context.log(
        `[${id}] Timer - Purge builds which were last modified more than ${purgeBuildsAfterDays} days ago - since ${new Date(
          expiryTime
        )}`
      );

      const expiredEntities = await listAzureTableEntities(
        context,
        getAzureTableClientForProject(connectionString, project.id, "Builds"),
        { filter: `Timestamp lt '${expiryTime.toISOString()}'` }
      );
      await Promise.allSettled(
        expiredEntities.map(async (entity) =>
          purgeStorybookByCommitSha(
            context,
            connectionString,
            project.id,
            entity.rowKey || ""
          )
        )
      );
    }
  };
}

async function purgeStorybookByCommitSha(
  context: InvocationContext,
  connectionString: string,
  projectId: string,
  buildSHA: string
) {
  context.info(`Deleting Build for project: ${projectId}, commit: ${buildSHA}`);

  try {
    await getAzureTableClientForProject(
      connectionString,
      projectId,
      "Builds"
    ).deleteEntity(projectId, buildSHA);
  } catch (error) {
    context.error(`Failed to delete Build for ${projectId}/${buildSHA}`, error);
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
      `Failed to delete Build blobs for ${projectId}/${buildSHA}`,
      error
    );
  }
}
