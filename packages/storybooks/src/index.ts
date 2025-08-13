/**
 * Module exports a single function to register
 * the Storybooks management endpoints.
 *
 * @module
 */

import { app, type HttpFunctionOptions } from "@azure/functions";
import z from "zod";
import { timerPurgeHandler } from "./handlers/timer-purge-handler";
import { registerProjectsRouter } from "./routers/projects-router";
import { registerBuildsRouter } from "./routers/builds-router";
import { emptyObjectSchema, projectIdSchema } from "./utils/schemas";
import { registerLabelsRouter } from "./routers/labels-router";
import { registerWebUIRouter } from "./routers/web-ui-router";
import { registerStorybookRouter } from "./routers/storybook-router";
import {
  DEFAULT_CHECK_PERMISSIONS_CALLBACK,
  DEFAULT_PURGE_SCHEDULE_CRON,
  DEFAULT_STORAGE_CONN_STR_ENV_VAR,
  DEFAULT_SERVICE_NAME,
} from "./utils/constants";
import type { CheckPermissionCallback, OpenAPIOptions } from "./utils/types";
import { joinUrl } from "./utils/url-utils";
import { wrapHttpHandlerWithStore } from "./utils/store";

export type { CheckPermissionCallback, OpenAPIOptions };

/**
 * Options to register the storybooks router
 */
export type RegisterStorybooksRouterOptions = {
  /**
   * Name of the service. @default "storybooks"
   */
  serviceName?: string;

  /**
   * Define the route on which all router is placed.
   * Can be a sub-path of the main API route.
   *
   * @default ''
   */
  baseRoute?: string;

  /**
   * Set the Azure Functions authentication level for all routes.
   *
   * This is a good option to set if the service is used in
   * Headless mode and requires single token authentication
   * for all the requests.
   *
   * This setting does not affect health-check route.
   */
  authLevel?: "admin";

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

  /**
   * Directories to serve static files from relative to project root (package.json)
   * @default './public'
   */
  staticDirs?: string[];

  /**
   * Callback function to check permissions. The function receives following params
   * @param permission - object containing resource and action to permit
   * @param context - Invocation context of Azure Function
   * @param request - the HTTP request object
   *
   * @return `true` to allow access, or following to deny:
   * - `false` - returns 403 response
   * - `HttpResponse` - returns the specified HTTP response
   */
  checkPermission?: CheckPermissionCallback;

  /**
   * Default branch to use for GitHub repositories.
   * @default 'main'
   */
  defaultGitHubBranch?: string;
};

/**
 * Function to register all routes required to manage the Storybooks including
 * GET, POST and DELETE methods.
 *
 * @returns a function to register additional HTTP handlers for the service.
 */
export function registerStorybooksRouter(
  options: RegisterStorybooksRouterOptions = {}
): (name: string, options: HttpFunctionOptions) => void {
  const {
    serviceName = DEFAULT_SERVICE_NAME,
    baseRoute = "",
    authLevel,
    storageConnectionStringEnvVar = DEFAULT_STORAGE_CONN_STR_ENV_VAR,
    purgeScheduleCron,
    openapi,
    checkPermission = DEFAULT_CHECK_PERMISSIONS_CALLBACK,
    defaultGitHubBranch = "main",
  } = options;

  const storageConnectionString = process.env[storageConnectionStringEnvVar];

  if (!storageConnectionString) {
    throw new Error(
      "Missing env-var '${storageConnectionStringEnvVar}' value.\n" +
        "It is required to connect with Azure Storage resource."
    );
  }

  console.log("Registering Storybooks Router");

  const openAPIEnabled = !openapi?.disabled;

  app.setup({ enableHttpStream: true });

  const handlerWrapper = wrapHttpHandlerWithStore.bind(null, {
    serviceName,
    baseRoute,
    authLevel,
    connectionString: storageConnectionString,
    openapi,
    staticDirs: options.staticDirs || ["./public"],
    checkPermission,
    defaultGitHubBranch,
  });

  const normalisedServiceName = serviceName.toLowerCase().replace(/\s+/g, "_");
  registerProjectsRouter({
    serviceName: normalisedServiceName,
    baseRoute: joinUrl(baseRoute, "projects"),
    basePathParamsSchema: emptyObjectSchema,
    openAPIEnabled,
    handlerWrapper,
  });

  registerBuildsRouter({
    serviceName: normalisedServiceName,
    baseRoute: joinUrl(baseRoute, "projects", "{projectId}", "builds"),
    basePathParamsSchema: z.object({ projectId: projectIdSchema }),
    openAPIEnabled,
    handlerWrapper,
  });

  registerLabelsRouter({
    serviceName: normalisedServiceName,
    baseRoute: joinUrl(baseRoute, "projects", "{projectId}", "labels"),
    basePathParamsSchema: z.object({ projectId: projectIdSchema }),
    openAPIEnabled,
    handlerWrapper,
  });

  registerStorybookRouter({
    serviceName: normalisedServiceName,
    baseRoute: joinUrl(baseRoute, "_"),
    basePathParamsSchema: emptyObjectSchema,
    openAPIEnabled,
    handlerWrapper,
  });

  registerWebUIRouter({
    serviceName: normalisedServiceName,
    baseRoute,
    basePathParamsSchema: emptyObjectSchema,
    openAPIEnabled,
    handlerWrapper,
  });

  if (purgeScheduleCron !== null) {
    app.timer(`${normalisedServiceName}-timer_purge`, {
      schedule: purgeScheduleCron || DEFAULT_PURGE_SCHEDULE_CRON,
      handler: timerPurgeHandler(storageConnectionString),
    });
  }

  /**
   * Register an HTTP function.
   *
   * The baseRoute and authLevel is inherited.
   *
   * @param name unique name for the HTTP function
   * @param options Options for Azure HTTP function
   */
  function registerRoute(name: string, options: HttpFunctionOptions) {
    app.http(`${normalisedServiceName}-${name}`, {
      authLevel,
      ...options,
      route: joinUrl(baseRoute, options.route || name),
      handler: handlerWrapper(options.handler, undefined),
      methods: options.methods || ["GET"],
    });
  }

  return registerRoute;
}
