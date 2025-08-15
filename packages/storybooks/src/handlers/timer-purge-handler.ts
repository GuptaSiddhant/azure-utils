import { BuildsModel } from "#builds/model";
import { ProjectsModel } from "#projects/model";
import { DEFAULT_PURGE_AFTER_DAYS, ONE_DAY_IN_MS } from "../utils/constants";
import { TimerHandler } from "@azure/functions";

export const timerPurgeHandler: TimerHandler = async (timer, context) => {
  context.log("Timer triggered to purge old builds...", JSON.stringify(timer));

  const projectModel = new ProjectsModel();
  const projects = await projectModel.list();

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

    const buildsModel = new BuildsModel(project.id);
    const expiredBuilds = await buildsModel.list({
      filter: `Timestamp lt '${expiryTime.toISOString()}'`,
    });

    for (const build of expiredBuilds) {
      await buildsModel.sha(build.sha).delete();
    }
  }
};
