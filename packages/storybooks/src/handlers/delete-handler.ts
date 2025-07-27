import {
  deleteBlobsFromAzureStorageContainerOrThrow,
  getAzureStorageBlobContainerClient,
} from "../utils/azure-storage-blob";
import { responseError } from "../utils/error-utils";
import { storybookDeleteQueryParamsSchema } from "../utils/schemas";
import type { StorybooksRouterHttpHandler } from "../utils/types";
import {
  getAzureTableClient,
  listAzureTableEntities,
} from "../utils/azure-data-tables";

export const deleteStorybookHandler: StorybooksRouterHttpHandler =
  (options) => async (request, context) => {
    try {
      const queryParseResult = storybookDeleteQueryParamsSchema.safeParse(
        Object.fromEntries(request.query.entries())
      );
      if (!queryParseResult.success) {
        return responseError(queryParseResult.error, context, 400);
      }
      const data = queryParseResult.data;

      const containerClient = getAzureStorageBlobContainerClient(options);
      const tableClient = getAzureTableClient(options, "Commits");

      if ("commitSha" in data) {
        context.info(
          `Deleting Storybook for project: ${data.project}, commit: ${data.commitSha}`
        );
        await Promise.allSettled([
          deleteBlobsFromAzureStorageContainerOrThrow(
            context,
            containerClient,
            `${data.project}/${data.commitSha}/`
          ),
          tableClient.deleteEntity(data.project, data.commitSha),
        ]);
      } else {
        context.info(
          `Deleting all Storybooks for project: ${data.project}, branch: ${data.branch}`
        );
        const branchEntities = await listAzureTableEntities(context, options, {
          tableSuffix: "Commits",
          filter: `(project eq '${data.project}') and (branch eq '${data.branch}')`,
          select: ["project", "commitSha"],
        });
        const promises = branchEntities.map((entity) => [
          tableClient.deleteEntity(entity.project, entity.commitSha),
          deleteBlobsFromAzureStorageContainerOrThrow(
            context,
            containerClient,
            `${entity.project}/${entity.commitSha}/`
          ),
        ]);
        await Promise.allSettled(promises.flat());
      }

      return { status: 204 };
    } catch (error) {
      return responseError(error, context);
    }
  };
