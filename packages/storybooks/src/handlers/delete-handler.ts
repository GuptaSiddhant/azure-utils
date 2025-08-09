import { storybookDeleteQueryParamsSchema } from "../utils/schemas";
import type { StorybooksRouterHttpHandler } from "../utils/types";
import { listAzureTableEntities } from "../utils/azure-data-tables";
import { purgeStorybookByCommitSha } from "../utils/storage-utils";
import { responseError } from "../utils/response-utils";

export const deleteStorybookHandler: StorybooksRouterHttpHandler =
  (options) => async (request, context) => {
    const queryParams = Object.fromEntries(request.query.entries());
    context.log({ queryParams });

    const queryParseResult =
      storybookDeleteQueryParamsSchema.safeParse(queryParams);
    if (!queryParseResult.success) {
      return responseError(queryParseResult.error, context, 400);
    }
    const data = queryParseResult.data;

    if ("commitSha" in data) {
      await purgeStorybookByCommitSha(
        context,
        options,
        data.project,
        data.commitSha!
      );

      return { status: 204 };
    }

    try {
      context.info(
        `Deleting all Storybooks for project: ${data.project}, branch: ${data.branch}`
      );
      const branchEntities = await listAzureTableEntities(
        context,
        options,
        "Commits",
        {
          filter: `(project eq '${
            data.project
          }') and (branch eq '${data.branch!}')`,
          select: ["project", "commitSha"],
        }
      );

      if (branchEntities.length === 0) {
        return {
          status: 404,
          body: `No commits found for branch '${data.branch}'.`,
        };
      }

      const promises = branchEntities.map((entity) =>
        purgeStorybookByCommitSha(
          context,
          options,
          entity.project,
          entity.commitSha
        )
      );
      await Promise.allSettled(promises.flat());

      return { status: 204 };
    } catch (error) {
      return responseError(error, context);
    }
  };
