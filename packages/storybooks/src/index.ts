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
  DEFAULT_PURGE_SCHEDULE_CRON,
  DEFAULT_STORAGE_CONN_STR_ENV_VAR,
  SERVICE_NAME,
} from "./utils/constants";
import type { OpenAPIOptions } from "./utils/types";
import { joinUrl } from "./utils/url-utils";
import { wrapHttpHandlerWithRequestStore } from "./utils/stores";

export type { OpenAPIOptions };

/**
 * Options to register the storybooks router
 */
export type RegisterStorybooksRouterOptions = {
  /**
   * Define the route on which all router is placed.
   *
   * @default 'storybooks/'
   */
  route?: string;

  /**
   * Name of the Environment variable which stores
   * the connection string to the Azure Storage resource.
   * @default 'AzureWebJobsStorage'
   */
  storageConnectionStringEnvVar?: string;

  /**
   * Modify the cron-schedule of timer function
   * which purge outdated storybooks.
   *
   * Pass `null` to disable auto-purge functionality.
   *
   * @default "0 0 0 * * *" // Every midnight
   */
  purgeScheduleCron?: string | null;

  /**
   * Options to configure OpenAPI schema
   */
  openapi?: OpenAPIOptions;
};

/**
 * Function to register all routes required to manage the Storybooks including
 * GET, POST and DELETE methods.
 */
export function registerStorybooksRouter(
  options: RegisterStorybooksRouterOptions = {}
) {
  const {
    route = "",
    storageConnectionStringEnvVar = DEFAULT_STORAGE_CONN_STR_ENV_VAR,
    purgeScheduleCron,
    openapi,
  } = options;

  const storageConnectionString = process.env[storageConnectionStringEnvVar];

  if (!storageConnectionString) {
    throw new Error(
      "Missing env-var '${storageConnectionStringEnvVar}' value.\n" +
        "It is required to connect with Azure Storage resource."
    );
  }

  const openAPIEnabled = !openapi?.disabled;

  app.setup({ enableHttpStream: true });

  const handlerWrapper = wrapHttpHandlerWithRequestStore.bind(null, {
    connectionString: storageConnectionString,
    baseRoute: route,
  });

  registerProjectsRouter({
    baseRoute: joinUrl(route, "projects"),
    basePathParamsSchema: emptyObjectSchema,
    openAPI: openAPIEnabled,
    handlerWrapper,
  });

  registerBuildsRouter({
    baseRoute: joinUrl(route, "projects", "{projectId}", "builds"),
    basePathParamsSchema: z.object({ projectId: projectIdSchema }),
    openAPI: openAPIEnabled,
    handlerWrapper,
  });

  registerLabelsRouter({
    baseRoute: joinUrl(route, "projects", "{projectId}", "labels"),
    basePathParamsSchema: z.object({ projectId: projectIdSchema }),
    openAPI: openAPIEnabled,
    handlerWrapper,
  });

  registerStorybookRouter({
    baseRoute: joinUrl(route, "_"),
    basePathParamsSchema: emptyObjectSchema,
    openAPI: openAPIEnabled,
    handlerWrapper,
  });

  registerWebUIRouter({
    baseRoute: route,
    basePathParamsSchema: emptyObjectSchema,
    openAPI: openAPIEnabled,
    handlerWrapper,
  });

  if (openAPIEnabled) {
    app.get(`${SERVICE_NAME}-openapi`, {
      route: joinUrl(route, "openapi"),
      handler: handlerWrapper(openAPIHandler(openapi)),
    });
  }

  if (purgeScheduleCron !== null) {
    app.timer(`${SERVICE_NAME}-timer_purge`, {
      schedule: purgeScheduleCron || DEFAULT_PURGE_SCHEDULE_CRON,
      runOnStartup: process.env["NODE_ENV"]?.toLowerCase() === "production",
      handler: timerPurgeHandler(storageConnectionString),
    });
  }
}
