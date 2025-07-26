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
  DEFAULT_PURGE_SCHEDULE_CRON,
  DEFAULT_STORAGE_CONN_STR_ENV_VAR,
  SERVICE_NAME,
} from "./utils/constants";
import { uploadStorybookHandler } from "./handlers/upload-handler";
import { onStorybookUploadedHandler } from "./handlers/on-uploaded-handler";

export function registerStorybooksRouter(
  options: RegisterStorybooksRouterOptions = {}
) {
  const {
    authLevel,
    route = SERVICE_NAME,
    storageConnectionStringEnvVar = DEFAULT_STORAGE_CONN_STR_ENV_VAR,
    storageContainerName = DEFAULT_CONTAINER_NAME,
    purgeScheduleCron,
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
  };

  app.setup({ enableHttpStream: true });

  app.http(`${SERVICE_NAME}-upload`, {
    authLevel,
    route,
    methods: ["POST"],
    handler: uploadStorybookHandler(handlerOptions),
  });

  app.http(`${SERVICE_NAME}-delete`, {
    authLevel,
    route,
    methods: ["DELETE"],
    handler: async () => ({ status: 415 }),
  });

  app.http(`${SERVICE_NAME}-serve`, {
    authLevel,
    route,
    methods: ["GET", "HEAD"],
    handler: async () => ({ status: 415 }),
  });

  app.storageBlob(`${SERVICE_NAME}-on_uploaded`, {
    connection: storageConnectionStringEnvVar,
    path: `${storageContainerName}/{project}/{sha}/storybook.zip`,
    handler: onStorybookUploadedHandler(handlerOptions),
  });

  if (purgeScheduleCron !== null) {
    app.timer(`${SERVICE_NAME}-timer_purge`, {
      schedule: purgeScheduleCron || DEFAULT_PURGE_SCHEDULE_CRON,
      handler: async () => {},
    });
  }
}
