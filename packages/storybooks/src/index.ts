/**
 * Module exports a single function to register
 * the Storybooks management endpoints.
 *
 * @module
 */

import { app } from "@azure/functions";
import type {
  RegisterStorybooksRouterOptions,
  RouterHandlerOptions,
} from "./utils/types";
import {
  DEFAULT_CONTAINER_NAME,
  DEFAULT_PURGE_AFTER_DAYS,
  DEFAULT_PURGE_SCHEDULE_CRON,
  DEFAULT_STORAGE_CONN_STR_ENV_VAR,
  SERVICE_NAME,
} from "./utils/constants";
import { uploadStorybookHandler } from "./handlers/upload-handler";
import { onStorybookUploadedHandler } from "./handlers/on-uploaded-handler";
import { serveStorybookHandler } from "./handlers/serve-handler";
import { deleteStorybookHandler } from "./handlers/delete-handler";
import { timerPurgeHandler } from "./handlers/timer-purge-handler";

export function registerStorybooksRouter(
  options: RegisterStorybooksRouterOptions = {}
) {
  const {
    authLevel,
    route,
    storageConnectionStringEnvVar = DEFAULT_STORAGE_CONN_STR_ENV_VAR,
    storageContainerName = DEFAULT_CONTAINER_NAME,
    purgeScheduleCron,
    purgeAfterDays = DEFAULT_PURGE_AFTER_DAYS,
  } = options;

  const storageConnectionString = process.env[storageConnectionStringEnvVar];

  if (!storageConnectionString) {
    throw new Error(
      "Missing env-var '${storageConnectionStringEnvVar}' value.\n" +
        "It is required to connect with Azure Storage resource."
    );
  }

  const handlerOptions: RouterHandlerOptions = {
    containerName: storageContainerName,
    connectionString: storageConnectionString,
    purgeAfterDays,
  };

  const fullRoute = `${route || SERVICE_NAME}/{**path}`;

  app.setup({ enableHttpStream: true });

  app.http(`${SERVICE_NAME}-upload`, {
    authLevel,
    route: fullRoute,
    methods: ["POST"],
    handler: uploadStorybookHandler(handlerOptions),
  });

  app.http(`${SERVICE_NAME}-delete`, {
    authLevel,
    route: fullRoute,
    methods: ["DELETE"],
    handler: deleteStorybookHandler(handlerOptions),
  });

  app.http(`${SERVICE_NAME}-serve`, {
    authLevel,
    route: fullRoute,
    methods: ["GET"],
    handler: serveStorybookHandler(handlerOptions),
  });

  app.storageBlob(`${SERVICE_NAME}-on_uploaded`, {
    connection: storageConnectionStringEnvVar,
    path: `${storageContainerName}/{project}/{sha}/storybook.zip`,
    handler: onStorybookUploadedHandler(handlerOptions),
  });

  if (purgeScheduleCron !== null) {
    app.timer(`${SERVICE_NAME}-timer_purge`, {
      schedule: purgeScheduleCron || DEFAULT_PURGE_SCHEDULE_CRON,
      runOnStartup: true,
      handler: timerPurgeHandler(handlerOptions),
    });
  }
}
