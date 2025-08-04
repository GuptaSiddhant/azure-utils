import type { StorybooksRouterTimerHandler } from "../utils/types";
import { listAzureTableEntities } from "../utils/azure-data-tables";
import { purgeStorybookByCommitSha } from "../utils/storage-utils";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export const timerPurgeHandler: StorybooksRouterTimerHandler =
  (options) => async (timer, context) => {
    const { purgeAfterDays } = options;

    const expiryTime = new Date(Date.now() - purgeAfterDays * ONE_DAY_MS);

    context.log(
      `Timer - Purge storybooks which were last modified more than ${purgeAfterDays} days ago - since ${new Date(
        expiryTime
      )}`,
      JSON.stringify(timer)
    );

    const expiredEntities = await listAzureTableEntities(
      context,
      options,
      "Commits",
      {
        filter: `Timestamp lt '${expiryTime.toISOString()}'`,
      }
    );

    await Promise.allSettled(
      expiredEntities.map(async (entity) =>
        purgeStorybookByCommitSha(
          context,
          options,
          entity.project,
          entity.commitSha
        )
      )
    );
  };
