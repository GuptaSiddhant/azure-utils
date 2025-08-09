/**
 * Module exports a single function to register
 * the Storybooks management endpoints.
 *
 * @module
 */

import { app } from "@azure/functions";
import z from "zod";
import { timerPurgeHandler } from "./handlers/timer-purge-handler";
import { openAPIHandler } from "./handlers/openapi-handler";
import { registerProjectsRouter } from "./routers/projects-router";
import { registerBuildsRouter } from "./routers/builds-router";
import { emptyObjectSchema, projectIdSchema } from "./utils/schemas";
import { registerLabelsRouter } from "./routers/labels-router";
import { registerWebUIRouter } from "./routers/web-ui-router";
import { registerStorybookRouter } from "./routers/storybook-router";
import {
  DEFAULT_CONTAINER_NAME,
  DEFAULT_PURGE_AFTER_DAYS,
  DEFAULT_PURGE_SCHEDULE_CRON,
  DEFAULT_STORAGE_CONN_STR_ENV_VAR,
  SERVICE_NAME,
} from "./utils/constants";
import type {
  RegisterStorybooksRouterOptions,
  RouterHandlerOptions,
} from "./utils/types";
import { joinUrl } from "./utils/url-join";

export type { RegisterStorybooksRouterOptions };

/**
 * Function to register all routes required to manage the Storybooks including
 * GET, POST and DELETE methods.
 */
export function registerStorybooksRouter(
  options: RegisterStorybooksRouterOptions = {}
) {
  const {
    authLevel,
    route = "",
    storageConnectionStringEnvVar = DEFAULT_STORAGE_CONN_STR_ENV_VAR,
    storageContainerName = DEFAULT_CONTAINER_NAME,
    purgeScheduleCron,
    purgeAfterDays = DEFAULT_PURGE_AFTER_DAYS,
    openapi,
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

  const openAPIEnabled = !openapi?.disabled;

  app.setup({ enableHttpStream: true });

  registerProjectsRouter({
    baseRoute: joinUrl(route, "projects"),
    basePathParamsSchema: emptyObjectSchema,
    handlerOptions,
    openAPI: openAPIEnabled,
  });

  registerBuildsRouter({
    baseRoute: joinUrl(route, "projects", "{projectId}", "builds"),
    basePathParamsSchema: z.object({ projectId: projectIdSchema }),
    handlerOptions,
    openAPI: openAPIEnabled,
  });

  registerLabelsRouter({
    baseRoute: joinUrl(route, "projects", "{projectId}", "labels"),
    basePathParamsSchema: z.object({ projectId: projectIdSchema }),
    handlerOptions,
    openAPI: openAPIEnabled,
  });

  registerStorybookRouter({
    baseRoute: joinUrl(route, "_"),
    basePathParamsSchema: emptyObjectSchema,
    handlerOptions,
    openAPI: openAPIEnabled,
  });

  registerWebUIRouter({
    baseRoute: route,
    basePathParamsSchema: emptyObjectSchema,
    handlerOptions,
    openAPI: openAPIEnabled,
  });

  if (openAPIEnabled) {
    app.get(`${SERVICE_NAME}-openapi`, {
      authLevel,
      route: joinUrl(route, "openapi"),
      handler: openAPIHandler(openapi),
    });
  }

  if (purgeScheduleCron !== null) {
    app.timer(`${SERVICE_NAME}-timer_purge`, {
      schedule: purgeScheduleCron || DEFAULT_PURGE_SCHEDULE_CRON,
      runOnStartup: true,
      handler: timerPurgeHandler(handlerOptions),
    });
  }
}
